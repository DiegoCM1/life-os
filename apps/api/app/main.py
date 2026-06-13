"""Life Dashboard API — the single write front door for all input channels."""

from contextlib import asynccontextmanager

from fastapi import FastAPI

from .db import close_pool, open_pool
from .routes import router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await open_pool()
    yield
    await close_pool()


app = FastAPI(title="Life Dashboard API", lifespan=lifespan)
app.include_router(router, prefix="/api/v1")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
