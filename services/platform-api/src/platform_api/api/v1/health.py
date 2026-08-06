from fastapi import APIRouter, status
from fastapi.responses import JSONResponse
from sqlalchemy import text

from platform_api.infrastructure.database import get_session_factory
from platform_api.infrastructure.redis import ping_redis

router = APIRouter(tags=["health"])


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "sylora-platform-api"}


@router.get("/ready")
async def ready() -> JSONResponse:
    checks: dict[str, str] = {}
    try:
        session_factory = get_session_factory()
        async with session_factory() as session:
            await session.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception as exc:  # noqa: BLE001 — readiness must report failure
        checks["database"] = f"error: {exc}"

    try:
        if await ping_redis():
            checks["redis"] = "ok"
        else:
            checks["redis"] = "error: ping failed"
    except Exception as exc:  # noqa: BLE001
        checks["redis"] = f"error: {exc}"

    all_ok = all(value == "ok" for value in checks.values())
    return JSONResponse(
        status_code=status.HTTP_200_OK if all_ok else status.HTTP_503_SERVICE_UNAVAILABLE,
        content={"status": "ready" if all_ok else "degraded", "checks": checks},
    )
