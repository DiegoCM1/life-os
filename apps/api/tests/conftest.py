"""Test bootstrap.

`app.config` builds `Settings()` at import time and requires DATABASE_URL +
SHARED_SECRET, and `app.goals` imports `app.config`. So the env must exist BEFORE
any app module is imported — set dummy values here at collection time. These tests
never touch the DB (the functions under test are pure), so the values are throwaway.
"""

import os

os.environ.setdefault("DATABASE_URL", "postgresql://test:test@localhost:5432/test")
os.environ.setdefault("SHARED_SECRET", "test-secret")
