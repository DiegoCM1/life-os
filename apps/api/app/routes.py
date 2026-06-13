"""All API routes. One front door for every writer (web app today, Overseer in v2)."""

from datetime import date, timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from .auth import require_secret
from .config import today_mx
from .db import pool
from .notion import applications_summary

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


# ---------- fitness_metric ----------

class FitnessUpsert(BaseModel):
    metric: str = Field(min_length=1, max_length=64)
    value: float
    log_date: date | None = None


@router.put("/fitness")
async def upsert_fitness(body: FitnessUpsert) -> dict[str, Any]:
    log_date = body.log_date or today_mx()
    row = await pool().fetchrow(
        """
        insert into fitness_metric (log_date, metric, value)
        values ($1, $2, $3)
        on conflict (log_date, metric) do update set value = excluded.value
        returning log_date, metric, value
        """,
        log_date, body.metric, body.value,
    )
    return dict(row)


@router.get("/fitness")
async def get_fitness(days: int = Query(default=90, ge=1, le=400)) -> dict[str, Any]:
    since = today_mx() - timedelta(days=days)
    rows = await pool().fetch(
        """
        select log_date, metric, value from fitness_metric
        where log_date >= $1 order by metric, log_date
        """,
        since,
    )
    series: dict[str, list[dict[str, Any]]] = {}
    latest: dict[str, float] = {}
    for r in rows:
        m = r["metric"]
        v = float(r["value"])
        series.setdefault(m, []).append({"date": r["log_date"].isoformat(), "value": v})
        latest[m] = v  # rows are ordered by date, so the last write wins
    return {"latest": latest, "series": series}


# ---------- bets ----------

async def _streak_for_goal(goal_id: str) -> int:
    """Consecutive days with done=true ending today or yesterday (today not yet logged
    shouldn't read as a broken streak before the day is over)."""
    rows = await pool().fetch(
        """
        select log_date from daily_log
        where goal_id = $1 and done is true
        order by log_date desc limit 400
        """,
        goal_id,
    )
    done_dates = {r["log_date"] for r in rows}
    today = today_mx()
    cursor = today if today in done_dates else today - timedelta(days=1)
    streak = 0
    while cursor in done_dates:
        streak += 1
        cursor -= timedelta(days=1)
    return streak


@router.get("/bets")
async def get_bets() -> dict[str, Any]:
    rows = await pool().fetch("select * from bet order by id")
    bets = []
    for r in rows:
        streak = await _streak_for_goal(r["goal_id"]) if r["goal_id"] else r["current_streak"]
        every = r["payout_every_days"] or 30
        bets.append({
            "id": r["id"],
            "name": r["name"],
            "enforcer": r["enforcer"],
            "rule_summary": r["rule_summary"],
            "stake": float(r["stake"]),
            "reward": float(r["reward"]),
            "current_streak": streak,
            "days_to_payout": every - (streak % every),
            "net_balance": float(r["net_balance"]),
        })
    return {"bets": bets}


class BetPatch(BaseModel):
    net_balance: float | None = None
    current_streak: int | None = None
    stake: float | None = None
    reward: float | None = None
    rule_summary: str | None = None


@router.patch("/bets/{bet_id}")
async def patch_bet(bet_id: int, body: BetPatch) -> dict[str, Any]:
    row = await pool().fetchrow(
        """
        update bet set
          net_balance = coalesce($2, net_balance),
          current_streak = coalesce($3, current_streak),
          stake = coalesce($4, stake),
          reward = coalesce($5, reward),
          rule_summary = coalesce($6, rule_summary)
        where id = $1 returning id
        """,
        bet_id, body.net_balance, body.current_streak, body.stake,
        body.reward, body.rule_summary,
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Bet not found")
    return {"id": row["id"]}


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
    except Exception:
        # Notion being down must never blank the dashboard.
        return {"configured": True, "error": "notion_unavailable",
                "today_count": None, "status_breakdown": {}}
