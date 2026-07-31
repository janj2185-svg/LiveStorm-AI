from __future__ import annotations

import asyncio
import uuid
from collections.abc import AsyncIterator, Awaitable, Callable
from contextlib import asynccontextmanager
from typing import Any

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from redis.asyncio import from_url as redis_from_url
from sqlalchemy.ext.asyncio import AsyncEngine
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.ai_providers import ProviderRegistry
from app.ai_service import AIEventHub, seed_ai_tool_definitions
from app.business_service import (
    AccountingProvider,
    CalendarSyncProvider,
    ESignatureProvider,
    UnconfiguredAccountingProvider,
    UnconfiguredCalendarSyncProvider,
    UnconfiguredESignatureProvider,
    business_rate_limit_dependency,
)
from app.config import Settings, get_settings
from app.database import (
    check_database,
    create_engine,
    create_session_factory,
    seed_rbac,
)
from app.errors import install_exception_handlers
from app.gift_service import GiftConnectionHub
from app.ledger_service import FinancialOperationLockPool, seed_platform_accounts
from app.live_adapters import AdapterRegistry
from app.live_service import LiveEventHub
from app.logging import configure_logging
from app.middleware import (
    BodySizeLimitMiddleware,
    RequestContextMiddleware,
    SecurityHeadersMiddleware,
)
from app.payments import PaymentProvider, configured_payment_provider
from app.platform_service import (
    CertificateRenderer,
    ContentProcessor,
    UnconfiguredCertificateRenderer,
    UnconfiguredContentProcessor,
)
from app.routers import (
    admin,
    admin_ai,
    admin_operations,
    ai,
    auth,
    business,
    business_operations,
    creator_platform,
    gift_authoring,
    gifts,
    health,
    learning,
    ledger,
    live,
    marketplace,
    messaging,
    oauth,
    social,
    users,
)
from app.routers.messaging import MessageConnectionHub
from app.storage import S3ObjectStorage


def create_app(
    settings: Settings | None = None,
    *,
    engine: AsyncEngine | None = None,
    redis_client: Any | None = None,
    payment_provider: PaymentProvider | None = None,
    object_storage: S3ObjectStorage | None = None,
    ai_provider_registry: ProviderRegistry | None = None,
    ai_job_dispatcher: Callable[[uuid.UUID], Awaitable[None]] | None = None,
    live_adapter_registry: AdapterRegistry | None = None,
    live_webhook_dispatcher: Callable[[uuid.UUID], Awaitable[None]] | None = None,
    content_processor: ContentProcessor | None = None,
    certificate_renderer: CertificateRenderer | None = None,
    content_publish_dispatcher: (Callable[[uuid.UUID, Any], Awaitable[None]] | None) = None,
    esignature_provider: ESignatureProvider | None = None,
    accounting_provider: AccountingProvider | None = None,
    calendar_sync_provider: CalendarSyncProvider | None = None,
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
    resolved_ai_registry = ai_provider_registry or ProviderRegistry()

    async def dispatch_ai_job(job_id: uuid.UUID) -> None:
        from app.celery_app import celery_app

        await asyncio.to_thread(
            celery_app.send_task,
            "sylora.ai.process_generation_job",
            args=[str(job_id)],
        )

    async def dispatch_live_webhook(delivery_id: uuid.UUID) -> None:
        from app.celery_app import celery_app

        await asyncio.to_thread(
            celery_app.send_task,
            "sylora.live.process_webhook",
            args=[str(delivery_id)],
        )

    async def dispatch_content_publish(content_id: uuid.UUID, scheduled_at: Any) -> None:
        from app.celery_app import celery_app

        await asyncio.to_thread(
            celery_app.send_task,
            "sylora.content.publish_scheduled",
            args=[str(content_id)],
            eta=scheduled_at,
        )

    @asynccontextmanager
    async def lifespan(application: FastAPI) -> AsyncIterator[None]:
        await check_database(resolved_engine)
        await resolved_redis.ping()
        async with session_factory() as session:
            await seed_rbac(session)
            await seed_platform_accounts(session)
            await seed_ai_tool_definitions(session)
            if ai_provider_registry is None:
                await resolved_ai_registry.refresh_from_database(session, resolved_settings)
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
        summary="SYLORA identity, social, wallet, AI, and live platform API",
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
            {"name": "Social", "description": "First-party social graph and content"},
            {"name": "Messaging", "description": "Persisted direct and community messaging"},
            {"name": "Wallet", "description": "Immutable double-entry credit ledger"},
            {"name": "Payments", "description": "Configured external payment boundary"},
            {"name": "Gifts", "description": "Gift catalog, inventory, sends, and events"},
            {"name": "Gift authoring", "description": "Versioned gift runtime contracts"},
            {
                "name": "AI Brain",
                "description": "Consent-gated provider-neutral assistant and generation",
            },
            {
                "name": "AI Live Hub",
                "description": "Official live integrations and durable control plane",
            },
            {
                "name": "Creator platform",
                "description": "Creator channels, subscriptions, content, and analytics",
            },
            {
                "name": "Marketplace",
                "description": "Stores, products, carts, orders, fulfillment, and reviews",
            },
            {
                "name": "Learning",
                "description": "Courses, progress, quizzes, and verifiable certificates",
            },
            {"name": "Administration", "description": "Server-enforced RBAC"},
            {"name": "Operations", "description": "Health and telemetry"},
        ],
        lifespan=lifespan,
    )
    app.state.settings = resolved_settings
    app.state.engine = resolved_engine
    app.state.session_factory = session_factory
    app.state.redis = resolved_redis
    app.state.message_hub = MessageConnectionHub()
    app.state.gift_hub = GiftConnectionHub()
    app.state.ai_event_hub = AIEventHub()
    app.state.live_event_hub = LiveEventHub()
    app.state.financial_operation_locks = FinancialOperationLockPool()
    app.state.payment_provider = payment_provider or configured_payment_provider(resolved_settings)
    app.state.object_storage = object_storage or S3ObjectStorage(resolved_settings)
    app.state.ai_provider_registry = resolved_ai_registry
    app.state.ai_job_dispatcher = ai_job_dispatcher or dispatch_ai_job
    app.state.live_adapter_registry = live_adapter_registry or AdapterRegistry(resolved_settings)
    app.state.live_webhook_dispatcher = live_webhook_dispatcher or dispatch_live_webhook
    app.state.content_processor = content_processor or UnconfiguredContentProcessor()
    app.state.certificate_renderer = certificate_renderer or UnconfiguredCertificateRenderer()
    app.state.content_publish_dispatcher = content_publish_dispatcher or dispatch_content_publish
    app.state.esignature_provider = esignature_provider or UnconfiguredESignatureProvider()
    app.state.accounting_provider = accounting_provider or UnconfiguredAccountingProvider()
    app.state.calendar_sync_provider = (
        calendar_sync_provider or UnconfiguredCalendarSyncProvider()
    )
    app.state.ready = False

    app.add_middleware(TrustedHostMiddleware, allowed_hosts=resolved_settings.allowed_hosts)
    if resolved_settings.cors_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=resolved_settings.cors_origins,
            allow_credentials=False,
            allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
            allow_headers=[
                "Authorization",
                "Content-Type",
                "Idempotency-Key",
                "X-Payment-Signature",
                "X-Request-ID",
                "X-Service-Signature",
                "X-Service-Timestamp",
            ],
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
    app.include_router(admin_operations.router, prefix=resolved_settings.api_prefix)
    app.include_router(admin_ai.router, prefix=resolved_settings.api_prefix)
    app.include_router(ai.router, prefix=resolved_settings.api_prefix)
    app.include_router(social.router, prefix=resolved_settings.api_prefix)
    app.include_router(messaging.router, prefix=resolved_settings.api_prefix)
    app.include_router(ledger.router, prefix=resolved_settings.api_prefix)
    app.include_router(live.router, prefix=resolved_settings.api_prefix)
    app.include_router(live.admin_router, prefix=resolved_settings.api_prefix)
    app.include_router(live.websocket_router, prefix=resolved_settings.api_prefix)
    app.include_router(gift_authoring.router, prefix=resolved_settings.api_prefix)
    app.include_router(gifts.router, prefix=resolved_settings.api_prefix)
    app.include_router(gifts.admin_router, prefix=resolved_settings.api_prefix)
    app.include_router(gifts.websocket_router, prefix=resolved_settings.api_prefix)
    app.include_router(creator_platform.router, prefix=resolved_settings.api_prefix)
    app.include_router(marketplace.router, prefix=resolved_settings.api_prefix)
    app.include_router(learning.router, prefix=resolved_settings.api_prefix)
    app.include_router(
        business.router,
        prefix=resolved_settings.api_prefix,
        dependencies=[Depends(business_rate_limit_dependency)],
    )
    app.include_router(
        business_operations.router,
        prefix=resolved_settings.api_prefix,
        dependencies=[Depends(business_rate_limit_dependency)],
    )
    install_exception_handlers(app)
    return app


app = create_app()
