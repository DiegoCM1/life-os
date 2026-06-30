"""asyncpg pool, created on app startup and closed on shutdown."""

import asyncpg

from .config import settings

_pool: asyncpg.Pool | None = None


async def open_pool() -> None:
    global _pool
    # Small pool: single-user app, Supabase free-tier connection limits.
    _pool = await asyncpg.create_pool(settings.database_url, min_size=1, max_size=4)


async def close_pool() -> None:
    if _pool is not None:
        await _pool.close()


def pool() -> asyncpg.Pool:
    assert _pool is not None, "DB pool not initialized"
    return _pool
