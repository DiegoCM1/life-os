"""Differential contract test for is_late (Python) against the shared golden vectors.

`is_late` here and `isLate` in apps/web/src/lib/time.ts are hand-ported copies of
the same rule. Both are checked against the SAME file — test-vectors/is_late.json —
so if either implementation drifts, its side goes red. This is the drift guard.
"""

import json
from datetime import date, datetime
from pathlib import Path

import pytest

from app.goals import is_late

_VECTORS_PATH = Path(__file__).resolve().parents[3] / "test-vectors" / "is_late.json"
_VECTORS = json.loads(_VECTORS_PATH.read_text())


@pytest.mark.parametrize("case", _VECTORS, ids=[c["name"] for c in _VECTORS])
def test_is_late_matches_golden_vector(case):
    log_date = date.fromisoformat(case["log_date"])
    done_at = datetime.fromisoformat(case["done_at"]) if case["done_at"] is not None else None
    assert is_late(log_date, done_at, case["hour"]) is case["expected"]
