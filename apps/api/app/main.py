"""Life Dashboard API — the single write front door for all input channels."""

import logging
import os
import time
import uuid
from contextlib import asynccontextmanager
from contextvars import ContextVar

from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse

from . import diagnostics
from .db import close_pool, open_pool
from .routes import router

# Correlates every log line and error response for one request. The id comes
# back to the caller in X-Request-ID, so a screenshot of a broken page is enough
# to find the exact server-side traceback.
request_id_var: ContextVar[str] = ContextVar("request_id", default="-")


class RequestIdFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_var.get()
        return True


def _configure_logging() -> None:
    level = os.getenv("LOG_LEVEL", "INFO").upper()
    handler = logging.StreamHandler()
    handler.setFormatter(
        logging.Formatter("%(asctime)s %(levelname)s [%(request_id)s] %(name)s: %(message)s")
    )
    handler.addFilter(RequestIdFilter())
    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(level)


log = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    _configure_logging()
    await open_pool()  # never raises; logs CRITICAL and lets /health report it
    yield
    await close_pool()


app = FastAPI(title="Life Dashboard API", lifespan=lifespan)
app.include_router(router, prefix="/api/v1")


@app.middleware("http")
async def request_context(request: Request, call_next):
    rid = request.headers.get("X-Request-ID") or uuid.uuid4().hex[:12]
    request_id_var.set(rid)
    started = time.monotonic()
    try:
        response = await call_next(request)
    except Exception:
        # Unhandled — log the full traceback with the path that caused it, then
        # hand the caller the id rather than a bare "Internal Server Error".
        ms = (time.monotonic() - started) * 1000
        log.exception("UNHANDLED %s %s after %.0fms", request.method, request.url.path, ms)
        return JSONResponse(
            status_code=500,
            content={
                "error": "internal_error",
                "detail": "Unhandled server error — check API logs for this request id.",
                "request_id": rid,
                "path": request.url.path,
            },
            headers={"X-Request-ID": rid},
        )

    ms = (time.monotonic() - started) * 1000
    response.headers["X-Request-ID"] = rid
    response.headers["Server-Timing"] = f"app;dur={ms:.1f}"
    # Server errors are logged at error level even when a route handled them, so
    # a route returning 500 quietly still shows up.
    if response.status_code >= 500:
        log.error("%s %s → %d (%.0fms)", request.method, request.url.path, response.status_code, ms)
    return response


@app.get("/health")
async def health(response: Response) -> dict[str, object]:
    """Liveness + database. THIS is what Railway's healthcheckPath points at.

    It touches the DB on purpose: a shallow "ok" keeps a broken deploy in
    rotation, which is exactly how a dead database once looked green all day.
    """
    probe = await diagnostics.probe_db()
    ok = probe["status"] in ("ok", "degraded")
    if not ok:
        response.status_code = 503
    return {"status": "ok" if ok else "degraded", "db": probe}


@app.get("/health/detail")
async def health_detail(response: Response, deep: bool = False) -> dict[str, object]:
    """Every dependency, with latency and the real error text.

    Pass ?deep=1 to also round-trip Notion (rate limited — off by default).
    Returns 200 even when degraded so the payload is always readable; the
    `status` field carries the verdict.
    """
    result = await diagnostics.run_all(deep=deep)
    result["request_id"] = request_id_var.get()
    return result
