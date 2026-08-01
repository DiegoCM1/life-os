"""Per-dependency health probes.

The outage that motivated this file: Supabase vanished, every route started
returning 500, and Railway's dashboard stayed green because it only checks that
the process bound its port. The process was fine — its database was gone.

Rules every probe here follows:
  * NEVER raise. A probe that throws is a probe that takes the healthcheck down
    with it, which is the failure mode it exists to report.
  * Always report latency. "Slow" and "down" need different responses, and you
    cannot tell them apart from a bare ok/fail.
  * Name the dependency and the actual error text. "degraded" without a reason
    sends you to read logs; the whole point is to not need the logs.
"""

import asyncio
import time
from typing import Any, Literal

from . import db
from .config import settings

Status = Literal["ok", "degraded", "down", "unconfigured"]

# A probe slower than this is reported as degraded even when it succeeds — a
# database answering in 4s is on its way to being an outage.
SLOW_MS = 2000
PROBE_TIMEOUT_SECONDS = 5.0


def _probe(name: str, status: Status, ms: float | None = None, detail: str | None = None) -> dict[str, Any]:
    out: dict[str, Any] = {"name": name, "status": status}
    if ms is not None:
        out["latency_ms"] = round(ms, 1)
    if detail:
        out["detail"] = detail
    return out


async def probe_db() -> dict[str, Any]:
    """`select 1` against the live pool, with an explicit timeout.

    Without the timeout a dead-but-routable database hangs the request until the
    client gives up, which reads as "slow app" rather than "database down".
    """
    started = time.monotonic()
    # Doubles as the recovery path: if the pool never opened (database was down
    # at boot), this reopens it, so the healthcheck is what brings the API back.
    if not await db.ensure_pool():
        return _probe("database", "down",
                      detail=f"pool not initialized — {db.last_error() or 'unknown error'}")
    pool = db.pool()

    try:
        await asyncio.wait_for(pool.fetchval("select 1"), timeout=PROBE_TIMEOUT_SECONDS)
    except asyncio.TimeoutError:
        ms = (time.monotonic() - started) * 1000
        return _probe("database", "down", ms, f"timed out after {PROBE_TIMEOUT_SECONDS}s")
    except Exception as e:
        ms = (time.monotonic() - started) * 1000
        return _probe("database", "down", ms, f"{type(e).__name__}: {e}")

    ms = (time.monotonic() - started) * 1000
    status: Status = "degraded" if ms > SLOW_MS else "ok"
    detail = f"slower than {SLOW_MS}ms" if status == "degraded" else None
    return _probe("database", status, ms, detail)


async def probe_notion(deep: bool = False) -> dict[str, Any]:
    """Config presence by default; a real API round-trip only when asked.

    Notion is rate limited (~3 req/s) and this endpoint may be polled, so the
    network call is opt-in via ?deep=1 rather than on every healthcheck.
    """
    if not settings.notion_token or not settings.notion_database_id:
        return _probe("notion", "unconfigured", detail="NOTION_TOKEN or NOTION_DATABASE_ID unset")
    if not deep:
        return _probe("notion", "ok", detail="configured (not probed; pass ?deep=1)")

    import httpx

    started = time.monotonic()
    try:
        async with httpx.AsyncClient(timeout=PROBE_TIMEOUT_SECONDS) as client:
            resp = await client.post(
                f"https://api.notion.com/v1/databases/{settings.notion_database_id}/query",
                headers={
                    "Authorization": f"Bearer {settings.notion_token}",
                    "Notion-Version": "2022-06-28",
                    "Content-Type": "application/json",
                },
                json={"page_size": 1},
            )
    except Exception as e:
        ms = (time.monotonic() - started) * 1000
        return _probe("notion", "down", ms, f"{type(e).__name__}: {e}")

    ms = (time.monotonic() - started) * 1000
    if resp.status_code == 401:
        return _probe("notion", "down", ms, "401 — NOTION_TOKEN rejected")
    if resp.status_code == 404:
        return _probe("notion", "down", ms,
                      "404 — database not found, or the integration lacks access to it")
    if resp.status_code >= 400:
        return _probe("notion", "down", ms, f"{resp.status_code} {resp.text[:120]}")
    status: Status = "degraded" if ms > SLOW_MS else "ok"
    return _probe("notion", status, ms)


def probe_config() -> dict[str, Any]:
    """Which optional integrations are wired. Secrets are never echoed — only
    whether each one is present, which is all you need to debug a 401."""
    optional = {
        "notion": bool(settings.notion_token and settings.notion_database_id),
        "openrouter": bool(settings.openrouter_api_key),
    }
    return _probe(
        "config",
        "ok",
        detail=", ".join(f"{k}={'set' if v else 'unset'}" for k, v in optional.items()),
    )


# Worst-first, so the overall verdict is the worst dependency's verdict.
_SEVERITY = {"ok": 0, "unconfigured": 1, "degraded": 2, "down": 3}


def overall(probes: list[dict[str, Any]]) -> Status:
    """`unconfigured` never fails the healthcheck — an unset Notion token is a
    deliberate state, not an outage, and must not pull the deploy out of
    rotation."""
    worst = max(probes, key=lambda p: _SEVERITY[p["status"]], default=None)
    if worst is None:
        return "ok"
    status: Status = worst["status"]
    return "ok" if status == "unconfigured" else status


async def run_all(deep: bool = False) -> dict[str, Any]:
    db_probe, notion_probe = await asyncio.gather(probe_db(), probe_notion(deep))
    probes = [db_probe, notion_probe, probe_config()]
    return {"status": overall(probes), "checks": probes}
