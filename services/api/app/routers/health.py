from __future__ import annotations

from fastapi import APIRouter, Request
from fastapi.responses import Response
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest

from app.database import check_database
from app.errors import APIError

router = APIRouter(tags=["Operations"])


@router.get("/health/live", include_in_schema=False)
async def live() -> dict[str, str]:
    return {"status": "live"}


@router.get("/health/ready", include_in_schema=False)
async def ready(request: Request) -> dict[str, str]:
    try:
        await check_database(request.app.state.engine)
        await request.app.state.redis.ping()
    except Exception as exc:
        raise APIError(
            503,
            "not_ready",
            "Service not ready",
            "A required service dependency is unavailable.",
        ) from exc
    return {"status": "ready"}


@router.get("/metrics", include_in_schema=False)
async def metrics() -> Response:
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)
