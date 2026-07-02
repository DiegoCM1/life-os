"""Backend source of truth for goals + deadline rules.

Mirrors the values in apps/web/src/config/goals.ts. The frontend keeps its own
copy for now (rendering), but deadline-MISS truth is computed here so external
watchers (the Overseer) never duplicate the rules — they call GET /misses and
ask "what's overdue and how bad".

Severity is the single derived signal:
  excused  — activity or whole-day Tregua (not a miss)
  ok       — done on time
  late     — done, but after the deadline hour
  failed   — done, but after the fail hour (a technicality; still bad)
  missed   — not done and the window has closed (past day, or today past deadline)
  pending  — not done, but today's window is still open
"""

from datetime import date, datetime

from .config import TIMEZONE

# Order defines the response order. Mirrors GOALS in goals.ts.
GOALS: list[dict[str, str]] = [
    {"id": "wake_up", "label": "Wake up early"},
    {"id": "posted", "label": "Posted"},
    {"id": "calisthenics", "label": "Calisthenics"},
    {"id": "interview_prep", "label": "Interview Prep + Studying"},
]

# Latest completion time (hour, TIMEZONE 24h) that still counts as on time.
GOAL_DEADLINE_HOUR: dict[str, int] = {
    "wake_up": 8,
    "posted": 19,
    "interview_prep": 19,
    "calisthenics": 21,
}

# "Too late" hour: a completion after this is a failure, not merely late.
GOAL_FAIL_HOUR: dict[str, int] = {
    "wake_up": 10,
}


def is_late(log_date: date, done_at: datetime | None, hour: int | None) -> bool:
    """True when done_at falls after `hour:00` (TIMEZONE) on log_date.

    Python port of isLate() in apps/web/src/lib/time.ts. done_at is a timezone-
    aware timestamptz from asyncpg; we compare wall-clock instants in TIMEZONE.
    """
    if done_at is None or hour is None:
        return False
    local = done_at.astimezone(TIMEZONE)
    deadline = datetime(log_date.year, log_date.month, log_date.day, hour, 0, 0, tzinfo=TIMEZONE)
    return local > deadline


def severity(
    goal_id: str,
    log: dict | None,
    day_tregua: bool,
    target: date,
    now: datetime,
) -> str:
    """Derive the miss severity for one goal on one date. `now` must be TIMEZONE-aware."""
    deadline = GOAL_DEADLINE_HOUR.get(goal_id)
    fail = GOAL_FAIL_HOUR.get(goal_id)
    done = bool(log and log["done"])
    done_at = log["done_at"] if log else None
    activity_tregua = bool(log and log["tregua"])

    if day_tregua or activity_tregua:
        return "excused"

    if done:
        if is_late(target, done_at, fail):
            return "failed"
        if is_late(target, done_at, deadline):
            return "late"
        return "ok"

    # Not done. A past day is closed; today closes once the deadline hour passes.
    if target < now.date():
        return "missed"
    if deadline is not None and now.hour >= deadline:
        return "missed"
    return "pending"
