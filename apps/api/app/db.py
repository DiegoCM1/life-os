"""asyncpg pool, created on app startup and closed on shutdown.

Startup deliberately does NOT crash when the database is unreachable. If it did,
a database that is merely paused would take the API down with it and keep it
down until someone redeployed by hand. Instead the app boots, `/health` reports
`down` with the real reason, and `ensure_pool()` reopens the pool on the next
probe — so recovery is automatic once the database comes back.
"""

import asyncio
import logging

import asyncpg

from .config import settings

log = logging.getLogger(__name__)

_pool: asyncpg.Pool | None = None
_last_error: str | None = None

# Startup retries. Covers the common case of the API booting a few seconds
# before its database is accepting connections.
_RETRIES = 3
_BACKOFF_SECONDS = 2.0


async def _create() -> asyncpg.Pool:
    # Small pool: single-user app, Supabase free-tier connection limits.
    return await asyncpg.create_pool(settings.database_url, min_size=1, max_size=4)


async def open_pool() -> None:
    global _pool, _last_error
    for attempt in range(1, _RETRIES + 1):
        try:
            _pool = await _create()
            _last_error = None
            log.info("DB pool ready")
            return
        except Exception as e:
            _last_error = f"{type(e).__name__}: {e}"
            if attempt < _RETRIES:
                log.warning("DB pool attempt %d/%d failed: %s", attempt, _RETRIES, _last_error)
                await asyncio.sleep(_BACKOFF_SECONDS * attempt)

    # Loud, and phrased as the thing to actually go check.
    log.critical(
        "DB POOL FAILED after %d attempts — the API is up but every data route "
        "will fail. Last error: %s. Check that the database is running and that "
        "DATABASE_URL is correct.",
        _RETRIES,
        _last_error,
    )


async def ensure_pool() -> bool:
    """Reopen the pool if startup never managed to. Returns True when usable."""
    global _pool, _last_error
    if _pool is not None:
        return True
    try:
        _pool = await _create()
        _last_error = None
        log.info("DB pool recovered")
        return True
    except Exception as e:
        _last_error = f"{type(e).__name__}: {e}"
        return False


def last_error() -> str | None:
    return _last_error


async def close_pool() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


def pool() -> asyncpg.Pool:
    if _pool is None:
        # Explicit over an assert: asserts vanish under `python -O`, and this is
        # the exact condition that produced a wall of opaque 500s.
        raise RuntimeError(
            f"DB pool not initialized — database unreachable at startup. Last error: {_last_error}"
        )
    return _pool
