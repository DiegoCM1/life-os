"""Single shared-secret gate for every write/read endpoint.

Accepts either `X-API-Key: <secret>` or `Authorization: Bearer <secret>` so
future writers (the Overseer) can use whichever header their HTTP client favors.
"""

import secrets

from fastapi import Header, HTTPException

from .config import settings


def require_secret(
    x_api_key: str | None = Header(default=None),
    authorization: str | None = Header(default=None),
) -> None:
    if not settings.shared_secret:
        raise HTTPException(status_code=500, detail="settings.shared_secret is not configured")

    candidate = x_api_key or ""
    if not candidate and authorization and authorization.startswith("Bearer "):
        candidate = authorization.removeprefix("Bearer ")

    if not secrets.compare_digest(candidate, settings.shared_secret):
        raise HTTPException(status_code=401, detail="Invalid or missing API secret")
