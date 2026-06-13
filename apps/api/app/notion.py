"""Read-only Notion access for the applications database.

The app NEVER writes to Notion. Results are cached in-process for 90 seconds so
the dashboard's polling doesn't hammer the Notion API (rate limit: ~3 req/s).
"""

import time
from typing import Any

import httpx

from .config import (
    NOTION_DATABASE_ID,
    NOTION_DATE_PROP,
    NOTION_STATUS_PROP,
    NOTION_TOKEN,
    today_mx,
)

NOTION_API = "https://api.notion.com/v1"
NOTION_VERSION = "2022-06-28"
CACHE_TTL_SECONDS = 90

_cache: dict[str, Any] = {"at": 0.0, "data": None}


def _headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {NOTION_TOKEN}",
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
    }


def _status_of(page: dict[str, Any]) -> str:
    prop = page.get("properties", {}).get(NOTION_STATUS_PROP, {})
    # Notion exposes this as either a `status` or `select` property type.
    inner = prop.get("status") or prop.get("select") or {}
    return inner.get("name") or "Unknown"


async def _query(client: httpx.AsyncClient, body: dict[str, Any]) -> dict[str, Any]:
    resp = await client.post(
        f"{NOTION_API}/databases/{NOTION_DATABASE_ID}/query",
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

    if not NOTION_TOKEN or not NOTION_DATABASE_ID:
        return {"configured": False, "today_count": 0, "status_breakdown": {}}

    today = today_mx().isoformat()
    async with httpx.AsyncClient(timeout=15) as client:
        today_pages: list[dict[str, Any]] = []
        cursor: str | None = None
        while True:
            body: dict[str, Any] = {
                "filter": {"property": NOTION_DATE_PROP, "date": {"equals": today}},
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
                "sorts": [{"property": NOTION_DATE_PROP, "direction": "descending"}],
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
