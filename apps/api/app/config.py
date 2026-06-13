"""Environment configuration. All secrets live in Railway env vars, never in code."""

import os
from datetime import date, datetime
from zoneinfo import ZoneInfo

TIMEZONE = ZoneInfo("America/Mexico_City")

DATABASE_URL = os.environ.get("DATABASE_URL", "")
SHARED_SECRET = os.environ.get("SHARED_SECRET", "")

NOTION_TOKEN = os.environ.get("NOTION_TOKEN", "")
NOTION_DATABASE_ID = os.environ.get("NOTION_DATABASE_ID", "")
# Property names in the Notion applications database (configurable per brief).
NOTION_DATE_PROP = os.environ.get("NOTION_DATE_PROP", "Date")
NOTION_STATUS_PROP = os.environ.get("NOTION_STATUS_PROP", "Status")
NOTION_TIER_PROP = os.environ.get("NOTION_TIER_PROP", "Tier")


def now_mx() -> datetime:
    return datetime.now(TIMEZONE)


def today_mx() -> date:
    return now_mx().date()
