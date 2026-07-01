"""Environment configuration.

Secrets live in env vars — injected by Railway in production, loaded from a local
`apps/api/.env` in development. Validated once at import time via pydantic-settings:
required fields with no default raise a ValidationError naming the missing var,
so a misconfiguration fails loudly at startup instead of cryptically at first use.
"""

from datetime import date, datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from pydantic_settings import BaseSettings, SettingsConfigDict

TIMEZONE = ZoneInfo("America/Mexico_City")

# config.py lives in apps/api/app/, so the project root is two levels up.
# Absolute path → the .env loads no matter what cwd the process starts from.
_ENV_FILE = Path(__file__).resolve().parent.parent / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=_ENV_FILE, extra="ignore")

    # Required — the app cannot function without these. Missing → ValidationError.
    database_url: str
    shared_secret: str

    # Optional — Notion integration degrades gracefully when unset.
    notion_token: str = ""
    notion_database_id: str = ""
    notion_date_prop: str = "Date"
    notion_status_prop: str = "Status"
    notion_tier_prop: str = "Tier"

    # Optional — AI weekly analysis via OpenRouter (OpenAI-compatible API). When
    # openrouter_api_key is unset, summary generation degrades gracefully (returns
    # None) and the review screen keeps whatever it already had. Set the key in
    # apps/api/.env; the model can be any OpenRouter slug.
    openrouter_api_key: str = ""
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    openrouter_model: str = "google/gemma-4-31b-it"


settings = Settings()


def now_mx() -> datetime:
    return datetime.now(TIMEZONE)


def today_mx() -> date:
    return now_mx().date()
