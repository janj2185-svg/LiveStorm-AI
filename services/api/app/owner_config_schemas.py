"""Pydantic schemas for Owner Configuration APIs."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class StrictSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")


OwnerStatusLiteral = Literal["missing", "invalid", "connected", "expired"]
OwnerProfileLiteral = Literal["development", "staging", "production"]


class OwnerFieldDescriptor(StrictSchema):
    key: str
    label: str
    env_var: str
    secret: bool
    required: bool
    kind: str
    placeholder: str = ""
    help_text: str = ""
    default: str | None = None
    configured: bool = False
    public_value: str | None = None


class OwnerProviderSummary(StrictSchema):
    key: str
    name: str
    category: str
    description: str
    status: OwnerStatusLiteral
    enabled: bool
    feature_flag_key: str
    environment: OwnerProfileLiteral = "production"
    related_features: list[str] = Field(default_factory=list)
    supports_live_test: bool = True
    version: int | None = None
    last_tested_at: datetime | None = None
    last_success_at: datetime | None = None
    last_error: str | None = None
    consecutive_failures: int = 0
    rotation_in_progress: bool = False
    key_expires_at: datetime | None = None
    setup_instructions: list[str] = Field(default_factory=list)
    callback_urls: list[str] = Field(default_factory=list)
    webhook_urls: list[str] = Field(default_factory=list)
    dns_requirements: list[str] = Field(default_factory=list)
    fields: list[OwnerFieldDescriptor] = Field(default_factory=list)
    record_id: uuid.UUID | None = None


class OwnerCatalogResponse(StrictSchema):
    domain: str
    environment: OwnerProfileLiteral
    providers: list[OwnerProviderSummary]
    connected_count: int
    missing_count: int
    invalid_count: int
    expired_count: int = 0
    required_providers: list[str] = Field(default_factory=list)
    recommended_providers: list[str] = Field(default_factory=list)
    deploy_ready: bool = False


class OwnerProviderUpsert(StrictSchema):
    values: dict[str, Any] = Field(default_factory=dict)
    expected_version: int | None = None
    test_connection: bool = True
    enable_on_success: bool = True
    rotate: bool = True
    key_expires_at: datetime | None = None
    environment: OwnerProfileLiteral | None = None


class OwnerConnectionTestResult(StrictSchema):
    provider_key: str
    status: OwnerStatusLiteral
    ok: bool
    message: str
    details: dict[str, Any] = Field(default_factory=dict)
    enabled: bool = False
    tested_at: datetime
    environment: OwnerProfileLiteral = "production"


class OwnerEnvFile(StrictSchema):
    filename: str
    description: str
    content: str


class OwnerEnvExportResponse(StrictSchema):
    generated_at: datetime
    files: list[OwnerEnvFile]
    note: str = (
        "Secrets are included for owner download only. Never commit these files. "
        "Prefer storing credentials via this panel; .env export is for deployment ops."
    )


class OwnerDeployReadiness(StrictSchema):
    environment: OwnerProfileLiteral
    ready: bool
    blocking: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    required: list[str] = Field(default_factory=list)
    recommended: list[str] = Field(default_factory=list)
    provider_statuses: dict[str, str] = Field(default_factory=dict)


class OwnerAlertView(StrictSchema):
    id: uuid.UUID
    provider_key: str
    environment: str
    severity: str
    title: str
    message: str
    acknowledged: bool
    created_at: datetime


class OwnerBackupView(StrictSchema):
    id: uuid.UUID
    environment: str
    label: str
    provider_count: int
    created_at: datetime
    created_by_id: uuid.UUID | None = None


class OwnerBackupCreate(StrictSchema):
    label: str | None = None
    environment: OwnerProfileLiteral | None = None


class OwnerBackupRestore(StrictSchema):
    rotate: bool = True


class OwnerHealthRunResult(StrictSchema):
    environment: str
    checked: int
    failed: int
    results: list[dict[str, Any]] = Field(default_factory=list)
    settings_overlay_ready: bool = True
    effective_smtp: bool = False


class OwnerUsageStats(StrictSchema):
    environment: str
    window_hours: int
    since: str
    openai: dict[str, Any]
    stripe: dict[str, Any]
    smtp: dict[str, Any]
    storage: dict[str, Any]
    health: dict[str, Any]
    providers_configured: int
    providers_connected: int


class OwnerAuditEventView(StrictSchema):
    id: uuid.UUID
    action: str
    actor_user_id: uuid.UUID | None = None
    created_at: datetime
    metadata: dict[str, Any] = Field(default_factory=dict)
