"""Unit tests for the deadline-severity logic in app.goals.

`severity()` is the authoritative signal the Overseer escalates on (and can place
real phone calls from), so every branch is pinned here. Pure functions — no DB.
"""

from datetime import date, datetime

from app.config import TIMEZONE
from app.goals import is_late, severity


def _dt(y, m, d, hh, mm=0):
    """Timezone-aware instant in the dashboard's timezone (America/Mexico_City)."""
    return datetime(y, m, d, hh, mm, tzinfo=TIMEZONE)


def _log(done=False, done_at=None, tregua=False):
    return {"done": done, "done_at": done_at, "tregua": tregua}


# ---------- is_late ----------

def test_is_late_none_inputs_are_never_late():
    assert is_late(date(2026, 6, 13), None, 8) is False
    assert is_late(date(2026, 6, 13), _dt(2026, 6, 13, 9), None) is False


def test_is_late_boundary_is_strict():
    # Exactly at the hour is on time; one minute past is late.
    assert is_late(date(2026, 6, 13), _dt(2026, 6, 13, 8, 0), 8) is False
    assert is_late(date(2026, 6, 13), _dt(2026, 6, 13, 8, 1), 8) is True


def test_is_late_next_day_backfill():
    # Tapped the following morning for the previous day → late.
    assert is_late(date(2026, 6, 13), _dt(2026, 6, 14, 6, 0), 8) is True


# ---------- severity: excused ----------

def test_day_tregua_excuses_even_without_a_log():
    assert severity("posted", None, True, date(2026, 6, 13), _dt(2026, 6, 13, 20)) == "excused"


def test_activity_tregua_excuses():
    log = _log(done=False, tregua=True)
    assert severity("posted", log, False, date(2026, 6, 13), _dt(2026, 6, 13, 20)) == "excused"


# ---------- severity: done ----------

def test_done_on_time_is_ok():
    log = _log(done=True, done_at=_dt(2026, 6, 13, 7, 0))
    assert severity("wake_up", log, False, date(2026, 6, 13), _dt(2026, 6, 13, 9)) == "ok"


def test_done_without_timestamp_is_ok():
    # done True but done_at missing (legacy row) → on time, not late.
    log = _log(done=True, done_at=None)
    assert severity("wake_up", log, False, date(2026, 6, 13), _dt(2026, 6, 13, 9)) == "ok"


def test_done_after_deadline_is_late():
    # wake_up deadline 08:00, fail 10:00 → 08:30 is late, not failed.
    log = _log(done=True, done_at=_dt(2026, 6, 13, 8, 30))
    assert severity("wake_up", log, False, date(2026, 6, 13), _dt(2026, 6, 13, 12)) == "late"


def test_done_after_fail_hour_is_failed():
    log = _log(done=True, done_at=_dt(2026, 6, 13, 10, 30))
    assert severity("wake_up", log, False, date(2026, 6, 13), _dt(2026, 6, 13, 12)) == "failed"


# ---------- severity: not done ----------

def test_past_day_not_done_is_missed():
    log = _log(done=False)
    assert severity("posted", log, False, date(2026, 6, 12), _dt(2026, 6, 13, 9)) == "missed"


def test_today_past_deadline_not_done_is_missed():
    # posted deadline 19:00; now 20:00 same day → window closed.
    log = _log(done=False)
    assert severity("posted", log, False, date(2026, 6, 13), _dt(2026, 6, 13, 20)) == "missed"


def test_today_before_deadline_not_done_is_pending():
    log = _log(done=False)
    assert severity("posted", log, False, date(2026, 6, 13), _dt(2026, 6, 13, 10)) == "pending"


def test_deadlineless_goal_today_is_pending():
    # A goal absent from GOAL_DEADLINE_HOUR never closes today on time-of-day alone.
    log = _log(done=False)
    assert severity("unknown_goal", log, False, date(2026, 6, 13), _dt(2026, 6, 13, 23)) == "pending"
