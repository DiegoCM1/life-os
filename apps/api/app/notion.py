"""Read-only Notion access for the applications database.

The app NEVER writes to Notion. Results are cached in-process for 90 seconds so
the dashboard's polling doesn't hammer the Notion API (rate limit: ~3 req/s).
"""

import time
from datetime import timedelta
from typing import Any

import httpx

from .config import settings, today_mx

NOTION_API = "https://api.notion.com/v1"
NOTION_VERSION = "2022-06-28"
CACHE_TTL_SECONDS = 90
DAILY_CACHE_TTL_SECONDS = 300

_cache: dict[str, Any] = {"at": 0.0, "data": None}
_daily_cache: dict[str, Any] = {"at": 0.0, "days": 0, "data": None}


def _headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {settings.notion_token}",
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
    }


def _status_of(page: dict[str, Any]) -> str:
    prop = page.get("properties", {}).get(settings.notion_status_prop, {})
    # Notion exposes this as either a `status` or `select` property type.
    inner = prop.get("status") or prop.get("select") or {}
    return inner.get("name") or "Unknown"


async def _query(client: httpx.AsyncClient, body: dict[str, Any]) -> dict[str, Any]:
    resp = await client.post(
        f"{NOTION_API}/databases/{settings.notion_database_id}/query",
        headers=_headers(),
        json=body,
    )
    resp.raise_for_status()
    return resp.json()


async def applications_summary() -> dict[str, Any]:
    """Today's application count + status breakdown of the most recent 100 entries."""
    now = time.monotonic()
    if _cache["data"] is not None and now - _cache["at"] < CACHE_TTL_SECONDS:
        return _cache["data"]

    if not settings.notion_token or not settings.notion_database_id:
        return {"configured": False, "today_count": 0, "status_breakdown": {}}

    today = today_mx().isoformat()
    async with httpx.AsyncClient(timeout=15) as client:
        today_pages: list[dict[str, Any]] = []
        cursor: str | None = None
        while True:
            body: dict[str, Any] = {
                "filter": {"property": settings.notion_date_prop, "date": {"equals": today}},
                "page_size": 100,
            }
            if cursor:
                body["start_cursor"] = cursor
            data = await _query(client, body)
            today_pages.extend(data.get("results", []))
            if not data.get("has_more"):
                break
            cursor = data.get("next_cursor")

        recent = await _query(
            client,
            {
                "sorts": [{"property": settings.notion_date_prop, "direction": "descending"}],
                "page_size": 100,
            },
        )

    breakdown: dict[str, int] = {}
    for page in recent.get("results", []):
        status = _status_of(page)
        breakdown[status] = breakdown.get(status, 0) + 1

    result = {
        "configured": True,
        "date": today,
        "today_count": len(today_pages),
        "status_breakdown": breakdown,
    }
    _cache["at"] = now
    _cache["data"] = result
    return result


def _select_of(page: dict[str, Any], prop: str) -> str:
    inner = page.get("properties", {}).get(prop, {})
    value = inner.get("select") or inner.get("status") or {}
    return value.get("name") or "Unknown"


_stats_cache: dict[str, Any] = {"at": 0.0, "data": None}


async def applications_stats() -> dict[str, Any]:
    """Full-database scan: total + per-status + per-tier counts (5 min cache).

    Powers the granular pipeline tables on the applications detail page.
    """
    now = time.monotonic()
    if _stats_cache["data"] is not None and now - _stats_cache["at"] < DAILY_CACHE_TTL_SECONDS:
        return _stats_cache["data"]

    if not settings.notion_token or not settings.notion_database_id:
        return {"configured": False, "total": 0, "status_counts": {}, "tier_counts": {}}

    status_counts: dict[str, int] = {}
    tier_counts: dict[str, int] = {}
    total = 0
    async with httpx.AsyncClient(timeout=30) as client:
        cursor: str | None = None
        while True:
            body: dict[str, Any] = {"page_size": 100}
            if cursor:
                body["start_cursor"] = cursor
            data = await _query(client, body)
            for page in data.get("results", []):
                total += 1
                status = _select_of(page, settings.notion_status_prop)
                status_counts[status] = status_counts.get(status, 0) + 1
                tier = _select_of(page, settings.notion_tier_prop)
                tier_counts[tier] = tier_counts.get(tier, 0) + 1
            if not data.get("has_more"):
                break
            cursor = data.get("next_cursor")

    result = {
        "configured": True,
        "total": total,
        "status_counts": status_counts,
        "tier_counts": tier_counts,
    }
    _stats_cache.update(at=now, data=result)
    return result


def _date_of(page: dict[str, Any]) -> str | None:
    prop = page.get("properties", {}).get(settings.notion_date_prop, {})
    inner = prop.get("date") or {}
    start = inner.get("start")
    return start[:10] if start else None


async def applications_daily(days: int) -> dict[str, Any]:
    """Applications per day for the last `days` days (topic detail charts).

    Cached harder than the summary (5 min) because it paginates the whole range.
    """
    now = time.monotonic()
    if (
        _daily_cache["data"] is not None
        and _daily_cache["days"] == days
        and now - _daily_cache["at"] < DAILY_CACHE_TTL_SECONDS
    ):
        return _daily_cache["data"]

    if not settings.notion_token or not settings.notion_database_id:
        return {"configured": False, "daily": []}

    start = (today_mx() - timedelta(days=days - 1)).isoformat()
    counts: dict[str, int] = {}
    async with httpx.AsyncClient(timeout=20) as client:
        cursor: str | None = None
        while True:
            body: dict[str, Any] = {
                "filter": {"property": settings.notion_date_prop, "date": {"on_or_after": start}},
                "page_size": 100,
            }
            if cursor:
                body["start_cursor"] = cursor
            data = await _query(client, body)
            for page in data.get("results", []):
                day = _date_of(page)
                if day:
                    counts[day] = counts.get(day, 0) + 1
            if not data.get("has_more"):
                break
            cursor = data.get("next_cursor")

    # Dense series: every day in range, zero-filled, oldest first.
    daily = []
    cursor_day = today_mx() - timedelta(days=days - 1)
    for _ in range(days):
        iso = cursor_day.isoformat()
        daily.append({"date": iso, "count": counts.get(iso, 0)})
        cursor_day += timedelta(days=1)

    result = {"configured": True, "daily": daily}
    _daily_cache.update(at=now, days=days, data=result)
    return result
