"""All API routes. One front door for every writer (web app today, Overseer in v2)."""

import json
from datetime import date
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from . import ai
from .auth import require_secret
from .config import now_mx, today_mx
from .db import pool
from .goals import GOAL_DEADLINE_HOUR, GOAL_FAIL_HOUR, GOALS, severity
from .notion import applications_daily, applications_stats, applications_summary

router = APIRouter(dependencies=[Depends(require_secret)])


# ---------- daily_log ----------

class LogUpsert(BaseModel):
    goal_id: str = Field(min_length=1, max_length=64)
    log_date: date | None = None  # defaults to today in America/Mexico_City
    done: bool | None = None
    value: float | None = None
    note: str | None = Field(default=None, max_length=2000)
    tregua: bool | None = None


@router.put("/log")
async def upsert_log(body: LogUpsert) -> dict[str, Any]:
    if body.done is None and body.value is None and body.note is None and body.tregua is None:
        raise HTTPException(status_code=422, detail="Provide done, value, note, and/or tregua")
    log_date = body.log_date or today_mx()
    # done_at stamps the moment done flips to true (and clears when it flips
    # back). note is the per-activity reason. tregua excuses the activity and is
    # mutually exclusive with done: marking done clears tregua, declaring tregua
    # clears done. A field left null in the request is left untouched.
    row = await pool().fetchrow(
        """
        insert into daily_log (log_date, goal_id, done, value, done_at, note, tregua)
        values ($1, $2, $3, $4, case when $3 is true then now() end, $5, coalesce($6, false))
        on conflict (log_date, goal_id) do update set
          done = case when $6 is true then false
                      else coalesce($3, daily_log.done) end,
          value = coalesce($4, daily_log.value),
          done_at = case
            when $6 is true then null
            when $3 is true and daily_log.done is distinct from true then now()
            when $3 is false then null
            else daily_log.done_at
          end,
          note = coalesce($5, daily_log.note),
          tregua = case when $3 is true then false
                       else coalesce($6, daily_log.tregua) end,
          updated_at = now()
        returning log_date, goal_id, done, value, done_at, note, tregua
        """,
        log_date, body.goal_id, body.done, body.value, body.note, body.tregua,
    )
    return dict(row)


@router.get("/today")
async def get_today() -> dict[str, Any]:
    today = today_mx()
    rows = await pool().fetch(
        "select goal_id, done, value, done_at, note, tregua from daily_log where log_date = $1",
        today,
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
        select log_date, goal_id, done, value, done_at, note, tregua from daily_log
        where log_date between $1 and $2 order by log_date
        """,
        start, end,
    )
    return {
        "logs": [
            {"log_date": r["log_date"].isoformat(), "goal_id": r["goal_id"],
             "done": r["done"], "value": float(r["value"]) if r["value"] is not None else None,
             "done_at": r["done_at"].isoformat() if r["done_at"] is not None else None,
             "note": r["note"], "tregua": r["tregua"]}
            for r in rows
        ]
    }


# ---------- misses (derived deadline severity, for the Overseer) ----------

@router.get("/misses")
async def get_misses(target: date | None = Query(default=None, alias="date")) -> dict[str, Any]:
    """Per-goal deadline severity for a date (defaults to today, TIMEZONE).

    The one endpoint an external watcher polls: it applies the deadline rules in
    goals.py so callers never duplicate them. `now` is returned so the caller can
    compute time-past-deadline against this server's authoritative clock.
    """
    day = target or today_mx()
    now = now_mx()
    log_rows = await pool().fetch(
        "select goal_id, done, done_at, tregua from daily_log where log_date = $1", day
    )
    logs = {r["goal_id"]: r for r in log_rows}
    dm = await pool().fetchrow("select tregua from day_meta where log_date = $1", day)
    day_tregua = bool(dm and dm["tregua"])

    goals = []
    for g in GOALS:
        log = logs.get(g["id"])
        goals.append({
            "goal_id": g["id"],
            "label": g["label"],
            "severity": severity(g["id"], log, day_tregua, day, now),
            "deadline_hour": GOAL_DEADLINE_HOUR.get(g["id"]),
            "fail_hour": GOAL_FAIL_HOUR.get(g["id"]),
            "done_at": log["done_at"].isoformat() if log and log["done_at"] is not None else None,
            "tregua": bool(log and log["tregua"]) or day_tregua,
        })
    return {"date": day.isoformat(), "now": now.isoformat(), "goals": goals}


# ---------- day_meta (day-level note + whole-day Tregua) ----------

class DayMetaPut(BaseModel):
    log_date: date | None = None  # defaults to today in America/Mexico_City
    note: str | None = Field(default=None, max_length=2000)
    tregua: bool | None = None


@router.put("/day-meta")
async def put_day_meta(body: DayMetaPut) -> dict[str, Any]:
    if body.note is None and body.tregua is None:
        raise HTTPException(status_code=422, detail="Provide note and/or tregua")
    log_date = body.log_date or today_mx()
    row = await pool().fetchrow(
        """
        insert into day_meta (log_date, note, tregua)
        values ($1, $2, coalesce($3, false))
        on conflict (log_date) do update set
          note = coalesce($2, day_meta.note),
          tregua = coalesce($3, day_meta.tregua),
          updated_at = now()
        returning log_date, note, tregua
        """,
        log_date, body.note, body.tregua,
    )
    return dict(row)


@router.get("/day-meta")
async def get_day_meta(
    start: date = Query(...), end: date = Query(...)
) -> dict[str, Any]:
    if end < start or (end - start).days > 366:
        raise HTTPException(status_code=422, detail="Invalid range")
    rows = await pool().fetch(
        "select log_date, note, tregua from day_meta where log_date between $1 and $2",
        start, end,
    )
    return {
        "days": [
            {"log_date": r["log_date"].isoformat(), "note": r["note"], "tregua": r["tregua"]}
            for r in rows
        ]
    }


# ---------- week_review (12 Week Year weekly reviews) ----------

def _week_row(r: Any) -> dict[str, Any]:
    return {
        "week_number": r["week_number"],
        "week_start": r["week_start"].isoformat() if r["week_start"] is not None else None,
        "exec_score": float(r["exec_score"]) if r["exec_score"] is not None else None,
        "sleep_avg": float(r["sleep_avg"]) if r["sleep_avg"] is not None else None,
        # answers is jsonb; asyncpg hands it back as text, so decode it.
        "answers": json.loads(r["answers"]) if r["answers"] else {},
        "ai_summary": r["ai_summary"],
        "reviewed": r["reviewed"],
    }


@router.get("/weeks")
async def get_weeks() -> dict[str, Any]:
    rows = await pool().fetch(
        """
        select week_number, week_start, exec_score, sleep_avg, answers, ai_summary, reviewed
        from week_review order by week_number
        """
    )
    return {"weeks": [_week_row(r) for r in rows]}


class WeekReviewPut(BaseModel):
    week_number: int = Field(ge=1, le=52)
    week_start: date | None = None
    exec_score: float | None = Field(default=None, ge=0, le=100)
    sleep_avg: float | None = Field(default=None, ge=0, le=24)
    answers: dict[str, str] | None = None
    reviewed: bool | None = None


@router.put("/weeks")
async def put_week(body: WeekReviewPut) -> dict[str, Any]:
    # A field left null in the request is left untouched (coalesce). answers, when
    # provided, replaces the stored map wholesale (the form always sends the full set).
    answers = json.dumps(body.answers) if body.answers is not None else None
    row = await pool().fetchrow(
        """
        insert into week_review (week_number, week_start, exec_score, sleep_avg, answers, reviewed)
        values ($1, $2, $3, $4, coalesce($5::jsonb, '{}'::jsonb), coalesce($6, false))
        on conflict (week_number) do update set
          week_start = coalesce($2, week_review.week_start),
          exec_score = coalesce($3, week_review.exec_score),
          sleep_avg = coalesce($4, week_review.sleep_avg),
          answers = coalesce($5::jsonb, week_review.answers),
          reviewed = coalesce($6, week_review.reviewed),
          updated_at = now()
        returning week_number, week_start, exec_score, sleep_avg, answers, ai_summary, reviewed
        """,
        body.week_number, body.week_start, body.exec_score, body.sleep_avg, answers, body.reviewed,
    )
    return _week_row(row)


class WeekSummaryGenerate(BaseModel):
    week_number: int = Field(ge=1, le=52)


@router.post("/weeks/generate-summary")
async def generate_week_summary(body: WeekSummaryGenerate) -> dict[str, Any]:
    # Generate the frozen per-week AI note via OpenRouter, then store it. The week
    # must already exist (reviewed). Prior weeks are passed as context only. 503
    # when AI is unconfigured/unavailable so the caller can keep what it had.
    rows = await pool().fetch(
        """
        select week_number, week_start, exec_score, sleep_avg, answers, ai_summary, reviewed
        from week_review where week_number <= $1 order by week_number
        """,
        body.week_number,
    )
    weeks = [_week_row(r) for r in rows]
    target = next((w for w in weeks if w["week_number"] == body.week_number), None)
    if target is None:
        raise HTTPException(status_code=404, detail="Week not found — save the review first")

    prior = [w for w in weeks if w["week_number"] < body.week_number]
    summary = await ai.week_summary(target, prior)
    if summary is None:
        raise HTTPException(status_code=503, detail="AI unavailable (OpenRouter unconfigured or down)")

    row = await pool().fetchrow(
        """
        update week_review set ai_summary = $2, updated_at = now()
        where week_number = $1
        returning week_number, week_start, exec_score, sleep_avg, answers, ai_summary, reviewed
        """,
        body.week_number, summary,
    )
    return _week_row(row)


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
