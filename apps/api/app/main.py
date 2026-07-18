"""Life Dashboard API — the single write front door for all input channels."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Response

from .db import close_pool, open_pool, pool
from .routes import router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await open_pool()
    yield
    await close_pool()


app = FastAPI(title="Life Dashboard API", lifespan=lifespan)
app.include_router(router, prefix="/api/v1")


@app.get("/health")
async def health(response: Response) -> dict[str, str]:
    # Touch the DB so the healthcheck actually detects a dead pool (a shallow
    # "ok" would keep a broken deploy in rotation). 503 when the DB is down.
    try:
        await pool().fetchval("select 1")
        return {"status": "ok", "db": "ok"}
    except Exception as e:
        logging.getLogger(__name__).error("health check DB error: %s", e)
        response.status_code = 503
        return {"status": "degraded", "db": "down"}
