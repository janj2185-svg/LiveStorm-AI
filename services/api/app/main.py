from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from redis.asyncio import from_url as redis_from_url
from sqlalchemy.ext.asyncio import AsyncEngine
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.config import Settings, get_settings
from app.database import (
    check_database,
    create_engine,
    create_session_factory,
    seed_rbac,
)
from app.errors import install_exception_handlers
from app.logging import configure_logging
from app.middleware import (
    BodySizeLimitMiddleware,
    RequestContextMiddleware,
    SecurityHeadersMiddleware,
)
from app.routers import admin, auth, health, oauth, users


def create_app(
    settings: Settings | None = None,
    *,
    engine: AsyncEngine | None = None,
    redis_client: Any | None = None,
) -> FastAPI:
    resolved_settings = settings or get_settings()
    resolved_engine = engine or create_engine(resolved_settings)
    owns_redis = redis_client is None
    resolved_redis = redis_client or redis_from_url(
        resolved_settings.redis_url,
        encoding="utf-8",
        decode_responses=True,
        health_check_interval=30,
    )
    session_factory = create_session_factory(resolved_engine)

    @asynccontextmanager
    async def lifespan(application: FastAPI) -> AsyncIterator[None]:
        await check_database(resolved_engine)
        await resolved_redis.ping()
        async with session_factory() as session:
            await seed_rbac(session)
        application.state.ready = True
        try:
            yield
        finally:
            application.state.ready = False
            if owns_redis:
                await resolved_redis.aclose()
            await resolved_engine.dispose()

    configure_logging()
    app = FastAPI(
        title="SYLORA API",
        summary="SYLORA identity and platform API",
        description=(
            "Production API foundation for SYLORA. Authentication uses bearer access "
            "tokens in the Authorization header; tokens are never stored in cookies, "
            "so browser cookie-CSRF does not apply. OAuth uses a separate, short-lived "
            "HttpOnly Secure SameSite=Lax state cookie and validates state plus PKCE."
        ),
        version="1.0.0",
        contact={"name": "SYLORA Security"},
        license_info={"name": "Proprietary"},
        openapi_tags=[
            {"name": "Identity", "description": "Registration and authentication"},
            {"name": "OAuth", "description": "Configured OIDC provider flows"},
            {"name": "Profiles", "description": "Owned and RBAC-managed user data"},
            {"name": "Administration", "description": "Server-enforced RBAC"},
            {"name": "Operations", "description": "Health and telemetry"},
        ],
        lifespan=lifespan,
    )
    app.state.settings = resolved_settings
    app.state.engine = resolved_engine
    app.state.session_factory = session_factory
    app.state.redis = resolved_redis
    app.state.ready = False

    app.add_middleware(TrustedHostMiddleware, allowed_hosts=resolved_settings.allowed_hosts)
    if resolved_settings.cors_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=resolved_settings.cors_origins,
            allow_credentials=False,
            allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
            allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
            expose_headers=["X-Request-ID"],
            max_age=600,
        )
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(RequestContextMiddleware)
    app.add_middleware(BodySizeLimitMiddleware, max_bytes=resolved_settings.max_body_bytes)

    app.include_router(health.router)
    app.include_router(auth.router, prefix=resolved_settings.api_prefix)
    app.include_router(oauth.router, prefix=resolved_settings.api_prefix)
    app.include_router(users.router, prefix=resolved_settings.api_prefix)
    app.include_router(admin.router, prefix=resolved_settings.api_prefix)
    install_exception_handlers(app)
    return app


app = create_app()
