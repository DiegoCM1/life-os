"""All API routes. One front door for every writer (web app today, Overseer in v2)."""

from datetime import date
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from .auth import require_secret
from .config import today_mx
from .db import pool
from .notion import applications_daily, applications_stats, applications_summary

router = APIRouter(dependencies=[Depends(require_secret)])


# ---------- daily_log ----------

class LogUpsert(BaseModel):
    goal_id: str = Field(min_length=1, max_length=64)
    log_date: date | None = None  # defaults to today in America/Mexico_City
    done: bool | None = None
    value: float | None = None


@router.put("/log")
async def upsert_log(body: LogUpsert) -> dict[str, Any]:
    if body.done is None and body.value is None:
        raise HTTPException(status_code=422, detail="Provide done and/or value")
    log_date = body.log_date or today_mx()
    row = await pool().fetchrow(
        """
        insert into daily_log (log_date, goal_id, done, value)
        values ($1, $2, $3, $4)
        on conflict (log_date, goal_id) do update set
          done = coalesce(excluded.done, daily_log.done),
          value = coalesce(excluded.value, daily_log.value),
          updated_at = now()
        returning log_date, goal_id, done, value
        """,
        log_date, body.goal_id, body.done, body.value,
    )
    return dict(row)


@router.get("/today")
async def get_today() -> dict[str, Any]:
    today = today_mx()
    rows = await pool().fetch(
        "select goal_id, done, value from daily_log where log_date = $1", today
    )
    return {"date": today.isoformat(), "logs": [dict(r) for r in rows]}


@router.get("/logs")
async def get_logs(
    start: date = Query(...), end: date = Query(...)
) -> dict[str, Any]:
    if end < start or (end - start).days > 366:
        raise HTTPException(status_code=422, detail="Invalid range")
    rows = await pool().fetch(
        """
        select log_date, goal_id, done, value from daily_log
        where log_date between $1 and $2 order by log_date
        """,
        start, end,
    )
    return {
        "logs": [
            {"log_date": r["log_date"].isoformat(), "goal_id": r["goal_id"],
             "done": r["done"], "value": float(r["value"]) if r["value"] is not None else None}
            for r in rows
        ]
    }


# ---------- status fields ----------

@router.get("/status")
async def get_status() -> dict[str, str]:
    rows = await pool().fetch("select key, value from status_field")
    return {r["key"]: r["value"] for r in rows}


class StatusPut(BaseModel):
    value: str = Field(max_length=500)


@router.put("/status/{key}")
async def put_status(key: str, body: StatusPut) -> dict[str, str]:
    await pool().execute(
        """
        insert into status_field (key, value) values ($1, $2)
        on conflict (key) do update set value = excluded.value, updated_at = now()
        """,
        key, body.value,
    )
    return {key: body.value}


# ---------- applications (Notion, read-only) ----------

@router.get("/applications")
async def get_applications() -> dict[str, Any]:
    try:
        return await applications_summary()
    except Exception as e:
        import logging; logging.getLogger(__name__).error("Notion error: %s", e)
        # Notion being down must never blank the dashboard.
        return {"configured": True, "error": "notion_unavailable",
                "today_count": None, "status_breakdown": {}}


@router.get("/applications/stats")
async def get_applications_stats() -> dict[str, Any]:
    try:
        return await applications_stats()
    except Exception as e:
        import logging; logging.getLogger(__name__).error("Notion error: %s", e)
        return {"configured": True, "error": "notion_unavailable",
                "total": 0, "status_counts": {}, "tier_counts": {}}


@router.get("/applications/daily")
async def get_applications_daily(days: int = Query(default=30, ge=1, le=366)) -> dict[str, Any]:
    try:
        return await applications_daily(days)
    except Exception as e:
        import logging; logging.getLogger(__name__).error("Notion error: %s", e)
        return {"configured": True, "error": "notion_unavailable", "daily": []}
