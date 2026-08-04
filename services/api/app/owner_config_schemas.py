"""Pydantic schemas for Owner Configuration APIs."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class StrictSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")


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
    status: Literal["missing", "invalid", "connected"]
    enabled: bool
    feature_flag_key: str
    related_features: list[str] = Field(default_factory=list)
    supports_live_test: bool = True
    version: int | None = None
    last_tested_at: datetime | None = None
    last_error: str | None = None
    setup_instructions: list[str] = Field(default_factory=list)
    callback_urls: list[str] = Field(default_factory=list)
    webhook_urls: list[str] = Field(default_factory=list)
    dns_requirements: list[str] = Field(default_factory=list)
    fields: list[OwnerFieldDescriptor] = Field(default_factory=list)
    record_id: uuid.UUID | None = None


class OwnerCatalogResponse(StrictSchema):
    domain: str
    providers: list[OwnerProviderSummary]
    connected_count: int
    missing_count: int
    invalid_count: int


class OwnerProviderUpsert(StrictSchema):
    values: dict[str, Any] = Field(default_factory=dict)
    expected_version: int | None = None
    test_connection: bool = True
    enable_on_success: bool = True


class OwnerConnectionTestResult(StrictSchema):
    provider_key: str
    status: Literal["missing", "invalid", "connected"]
    ok: bool
    message: str
    details: dict[str, Any] = Field(default_factory=dict)
    enabled: bool = False
    tested_at: datetime


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
