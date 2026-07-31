from __future__ import annotations

import re
import uuid
from datetime import datetime
from typing import Annotated, Any, Literal
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    field_validator,
    model_validator,
)

from app.business_models import (
    BudgetStatus,
    DealStatus,
    DocumentClassification,
    DocumentState,
    TaskPriority,
    TaskStatus,
    WorkspaceMembershipStatus,
    WorkspaceRole,
    WorkspaceStatus,
    WorkspaceType,
)

Slug = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True,
        to_lower=True,
        min_length=3,
        max_length=80,
        pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$",
    ),
]
Currency = Annotated[str, StringConstraints(to_upper=True, pattern=r"^[A-Z]{3}$")]
SHA256 = Annotated[str, StringConstraints(to_lower=True, pattern=r"^[a-f0-9]{64}$")]
SettingKey = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True,
        to_lower=True,
        min_length=2,
        max_length=96,
        pattern=r"^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$",
    ),
]


def validate_json(value: Any, *, depth: int = 0) -> Any:
    if depth > 4:
        raise ValueError("JSON nesting is too deep")
    if value is None or isinstance(value, bool):
        return value
    if isinstance(value, str):
        if len(value) > 2000:
            raise ValueError("JSON strings cannot exceed 2000 characters")
        return value
    if isinstance(value, int) and not isinstance(value, bool):
        if abs(value) > 9_007_199_254_740_991:
            raise ValueError("JSON integer is out of range")
        return value
    if isinstance(value, float):
        raise ValueError("floating-point JSON values are not accepted")
    if isinstance(value, list):
        if len(value) > 100:
            raise ValueError("JSON lists cannot exceed 100 items")
        return [validate_json(item, depth=depth + 1) for item in value]
    if isinstance(value, dict):
        if len(value) > 100:
            raise ValueError("JSON objects cannot exceed 100 keys")
        result: dict[str, Any] = {}
        for key, item in value.items():
            if not isinstance(key, str) or not 1 <= len(key) <= 64:
                raise ValueError("JSON keys must contain 1-64 characters")
            result[key] = validate_json(item, depth=depth + 1)
        return result
    raise ValueError("unsupported JSON value")


def require_aware(value: datetime | None) -> datetime | None:
    if value is not None and (value.tzinfo is None or value.utcoffset() is None):
        raise ValueError("timezone-aware datetime required")
    return value


def validate_timezone(value: str) -> str:
    try:
        ZoneInfo(value)
    except ZoneInfoNotFoundError as exc:
        raise ValueError("unknown IANA timezone") from exc
    return value


def plain_text(value: str | None) -> str | None:
    if value is not None and re.search(r"<[^>]+>", value):
        raise ValueError("HTML markup is not allowed")
    return value


def validate_permission_overrides(value: dict[str, bool] | None) -> dict[str, bool] | None:
    if value is None:
        return value
    if len(value) > 50 or any(not re.fullmatch(r"^[a-z][a-z0-9_.:-]{1,63}$", key) for key in value):
        raise ValueError("invalid permission override")
    return value


def validate_crm_tags(values: list[str]) -> list[str]:
    normalized = [value.strip().lower() for value in values]
    if any(not re.fullmatch(r"^[a-z0-9][a-z0-9 _-]{0,49}$", value) for value in normalized):
        raise ValueError("invalid CRM tag")
    return list(dict.fromkeys(normalized))


def validate_flag_subjects(values: list[str]) -> list[str]:
    if any(not 1 <= len(item) <= 160 for item in values):
        raise ValueError("feature-flag subjects must contain 1-160 characters")
    return list(dict.fromkeys(values))


def validate_reminders(value: list[int]) -> list[int]:
    if any(type(item) is not int or item < 0 or item > 525_600 for item in value):
        raise ValueError("reminders must be integer minutes from 0 through 525600")
    return sorted(set(value))


def validate_recurrence_rule(value: str | None) -> str | None:
    if value is None:
        return value
    parts = value.upper().split(";")
    parsed: dict[str, str] = {}
    for part in parts:
        if "=" not in part:
            raise ValueError("invalid recurrence rule")
        key, item = part.split("=", 1)
        if key in parsed or key not in {"FREQ", "INTERVAL", "COUNT", "UNTIL", "BYDAY"}:
            raise ValueError("unsupported recurrence rule component")
        parsed[key] = item
    if parsed.get("FREQ") not in {"DAILY", "WEEKLY", "MONTHLY"}:
        raise ValueError("recurrence FREQ must be DAILY, WEEKLY, or MONTHLY")
    if ("COUNT" in parsed) == ("UNTIL" in parsed):
        raise ValueError("recurrence requires exactly one of COUNT or UNTIL")
    if "INTERVAL" in parsed and (
        not parsed["INTERVAL"].isdigit() or not 1 <= int(parsed["INTERVAL"]) <= 365
    ):
        raise ValueError("recurrence INTERVAL is out of range")
    if "COUNT" in parsed and (
        not parsed["COUNT"].isdigit() or not 1 <= int(parsed["COUNT"]) <= 1000
    ):
        raise ValueError("recurrence COUNT is out of range")
    if "UNTIL" in parsed and not re.fullmatch(r"\d{8}T\d{6}Z", parsed["UNTIL"]):
        raise ValueError("recurrence UNTIL must be UTC basic date-time")
    if "BYDAY" in parsed and not re.fullmatch(
        r"(?:MO|TU|WE|TH|FR|SA|SU)(?:,(?:MO|TU|WE|TH|FR|SA|SU))*",
        parsed["BYDAY"],
    ):
        raise ValueError("recurrence BYDAY is invalid")
    return ";".join(parts)


class StrictSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ORMResponse(StrictSchema):
    model_config = ConfigDict(extra="forbid", from_attributes=True)


class CursorPage(StrictSchema):
    items: list[Any]
    next_cursor: str | None


class WorkspaceCreate(StrictSchema):
    slug: Slug
    name: str = Field(min_length=2, max_length=160)
    type: WorkspaceType
    locale: str = Field(default="en", min_length=2, max_length=16, pattern=r"^[A-Za-z-]+$")
    timezone: str = Field(default="UTC", min_length=1, max_length=64)
    currency: Currency = "USD"
    settings: dict[str, Any] = Field(default_factory=dict)

    _timezone = field_validator("timezone")(validate_timezone)
    _settings = field_validator("settings")(validate_json)
    _text = field_validator("name")(plain_text)


class WorkspacePatch(StrictSchema):
    name: str | None = Field(default=None, min_length=2, max_length=160)
    locale: str | None = Field(default=None, min_length=2, max_length=16, pattern=r"^[A-Za-z-]+$")
    timezone: str | None = Field(default=None, min_length=1, max_length=64)
    currency: Currency | None = None
    settings: dict[str, Any] | None = None

    _timezone = field_validator("timezone")(
        lambda value: validate_timezone(value) if value else value
    )
    _settings = field_validator("settings")(
        lambda value: validate_json(value) if value is not None else value
    )
    _text = field_validator("name")(plain_text)


class WorkspaceResponse(ORMResponse):
    id: uuid.UUID
    slug: str
    name: str
    type: WorkspaceType
    owner_user_id: uuid.UUID
    status: WorkspaceStatus
    locale: str
    timezone: str
    currency: str
    settings: dict[str, Any]
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None


class MembershipPatch(StrictSchema):
    role: WorkspaceRole | None = None
    status: WorkspaceMembershipStatus | None = None
    permission_overrides: dict[str, bool] | None = None

    _permission_keys = field_validator("permission_overrides")(validate_permission_overrides)


class MembershipResponse(ORMResponse):
    id: uuid.UUID
    workspace_id: uuid.UUID
    user_id: uuid.UUID
    role: WorkspaceRole
    status: WorkspaceMembershipStatus
    permission_overrides: dict[str, bool]
    joined_at: datetime | None
    created_at: datetime


class InvitationCreate(StrictSchema):
    email: str = Field(min_length=3, max_length=320)
    role: Literal[
        WorkspaceRole.admin,
        WorkspaceRole.manager,
        WorkspaceRole.member,
        WorkspaceRole.viewer,
    ] = WorkspaceRole.member
    permission_overrides: dict[str, bool] = Field(default_factory=dict)
    expires_in_hours: int = Field(default=72, ge=1, le=168, strict=True)

    _permission_keys = field_validator("permission_overrides")(validate_permission_overrides)


class InvitationAccept(StrictSchema):
    token: str = Field(min_length=32, max_length=256)


class TeamCreate(StrictSchema):
    name: str = Field(min_length=2, max_length=120)
    description: str | None = Field(default=None, max_length=1000)

    _text = field_validator("name", "description")(plain_text)


class TeamMemberAdd(StrictSchema):
    user_id: uuid.UUID


class CompanyCreate(StrictSchema):
    name: str = Field(min_length=1, max_length=200)
    domain: str | None = Field(
        default=None,
        max_length=253,
        pattern=r"^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[A-Za-z]{2,63}$",
    )
    phone: str | None = Field(default=None, max_length=40)
    tags: list[str] = Field(default_factory=list, max_length=50)
    custom_fields: dict[str, Any] = Field(default_factory=dict)
    owner_user_id: uuid.UUID | None = None
    source: str | None = Field(default=None, max_length=64)

    _json = field_validator("custom_fields")(validate_json)

    _tags = field_validator("tags")(validate_crm_tags)


class CompanyPatch(StrictSchema):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    domain: str | None = Field(default=None, max_length=253)
    phone: str | None = Field(default=None, max_length=40)
    tags: list[str] | None = Field(default=None, max_length=50)
    custom_fields: dict[str, Any] | None = None
    owner_user_id: uuid.UUID | None = None
    source: str | None = Field(default=None, max_length=64)

    _json = field_validator("custom_fields")(
        lambda value: validate_json(value) if value is not None else value
    )
    _tags = field_validator("tags")(lambda value: validate_crm_tags(value) if value else value)


class ContactCreate(StrictSchema):
    company_id: uuid.UUID | None = None
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    email: str | None = Field(default=None, min_length=3, max_length=320)
    phone: str | None = Field(default=None, max_length=40)
    job_title: str | None = Field(default=None, max_length=120)
    tags: list[str] = Field(default_factory=list, max_length=50)
    custom_fields: dict[str, Any] = Field(default_factory=dict)
    owner_user_id: uuid.UUID | None = None
    assignee_user_id: uuid.UUID | None = None
    consent_status: Literal["unknown", "opted_in", "opted_out"] = "unknown"
    source: str | None = Field(default=None, max_length=64)

    _json = field_validator("custom_fields")(validate_json)
    _tags = field_validator("tags")(validate_crm_tags)


class ContactPatch(StrictSchema):
    company_id: uuid.UUID | None = None
    first_name: str | None = Field(default=None, min_length=1, max_length=100)
    last_name: str | None = Field(default=None, min_length=1, max_length=100)
    email: str | None = Field(default=None, min_length=3, max_length=320)
    phone: str | None = Field(default=None, max_length=40)
    job_title: str | None = Field(default=None, max_length=120)
    tags: list[str] | None = Field(default=None, max_length=50)
    custom_fields: dict[str, Any] | None = None
    owner_user_id: uuid.UUID | None = None
    assignee_user_id: uuid.UUID | None = None
    consent_status: Literal["unknown", "opted_in", "opted_out"] | None = None
    source: str | None = Field(default=None, max_length=64)

    _json = field_validator("custom_fields")(
        lambda value: validate_json(value) if value is not None else value
    )
    _tags = field_validator("tags")(lambda value: validate_crm_tags(value) if value else value)


class PipelineStageCreate(StrictSchema):
    key: Slug
    name: str = Field(min_length=1, max_length=120)
    position: int = Field(ge=0, le=10_000, strict=True)
    probability_bps: int = Field(default=0, ge=0, le=10_000, strict=True)
    active: bool = True


class PipelineStagePatch(StrictSchema):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    position: int | None = Field(default=None, ge=0, le=10_000, strict=True)
    probability_bps: int | None = Field(default=None, ge=0, le=10_000, strict=True)
    active: bool | None = None


class DealCreate(StrictSchema):
    name: str = Field(min_length=1, max_length=200)
    contact_id: uuid.UUID | None = None
    company_id: uuid.UUID | None = None
    stage_id: uuid.UUID
    assignee_user_id: uuid.UUID | None = None
    value_minor: int = Field(default=0, ge=0, strict=True)
    currency: Currency
    probability_bps: int | None = Field(default=None, ge=0, le=10_000, strict=True)
    expected_close_at: datetime | None = None
    status: DealStatus = DealStatus.open

    _aware = field_validator("expected_close_at")(require_aware)


class DealPatch(StrictSchema):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    contact_id: uuid.UUID | None = None
    company_id: uuid.UUID | None = None
    assignee_user_id: uuid.UUID | None = None
    value_minor: int | None = Field(default=None, ge=0, strict=True)
    currency: Currency | None = None
    probability_bps: int | None = Field(default=None, ge=0, le=10_000, strict=True)
    expected_close_at: datetime | None = None
    status: DealStatus | None = None

    _aware = field_validator("expected_close_at")(require_aware)


class DealStageTransition(StrictSchema):
    stage_id: uuid.UUID
    note: str | None = Field(default=None, max_length=1000)


class DataJobCreate(StrictSchema):
    direction: Literal["import", "export"]
    resource: Literal["contacts", "companies", "deals"]
    input_object_key: str | None = Field(
        default=None, min_length=10, max_length=512, pattern=r"^business-imports/[A-Za-z0-9/_\-.]+$"
    )

    @model_validator(mode="after")
    def import_requires_key(self) -> DataJobCreate:
        if self.direction == "import" and self.input_object_key is None:
            raise ValueError("imports require a server-authorized S3 object key")
        if self.direction == "export" and self.input_object_key is not None:
            raise ValueError("exports cannot specify an input object key")
        return self


class TaskCreate(StrictSchema):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=20_000)
    status: TaskStatus = TaskStatus.todo
    priority: TaskPriority = TaskPriority.normal
    assignee_user_id: uuid.UUID | None = None
    team_id: uuid.UUID | None = None
    parent_id: uuid.UUID | None = None
    starts_at: datetime | None = None
    due_at: datetime | None = None

    _aware = field_validator("starts_at", "due_at")(require_aware)

    @model_validator(mode="after")
    def timing(self) -> TaskCreate:
        if self.starts_at and self.due_at and self.due_at < self.starts_at:
            raise ValueError("due_at must not precede starts_at")
        return self


class TaskPatch(StrictSchema):
    version: int = Field(ge=1, strict=True)
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=20_000)
    status: TaskStatus | None = None
    priority: TaskPriority | None = None
    assignee_user_id: uuid.UUID | None = None
    team_id: uuid.UUID | None = None
    parent_id: uuid.UUID | None = None
    starts_at: datetime | None = None
    due_at: datetime | None = None

    _aware = field_validator("starts_at", "due_at")(require_aware)


class TaskCommentCreate(StrictSchema):
    body: str = Field(min_length=1, max_length=10_000)

    _text = field_validator("body")(plain_text)


class CalendarEventCreate(StrictSchema):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=20_000)
    starts_at: datetime
    ends_at: datetime
    timezone: str = Field(min_length=1, max_length=64)
    attendees: list[uuid.UUID] = Field(default_factory=list, max_length=500)
    recurrence_rule: str | None = Field(default=None, max_length=500)
    reminders: list[int] = Field(default_factory=list, max_length=20)

    _aware = field_validator("starts_at", "ends_at")(require_aware)
    _timezone = field_validator("timezone")(validate_timezone)

    _reminders = field_validator("reminders")(validate_reminders)
    _recurrence = field_validator("recurrence_rule")(validate_recurrence_rule)

    @model_validator(mode="after")
    def valid_range(self) -> CalendarEventCreate:
        if self.ends_at <= self.starts_at:
            raise ValueError("ends_at must be later than starts_at")
        return self


class CalendarEventPatch(StrictSchema):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=20_000)
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    timezone: str | None = Field(default=None, min_length=1, max_length=64)
    attendees: list[uuid.UUID] | None = Field(default=None, max_length=500)
    recurrence_rule: str | None = Field(default=None, max_length=500)
    reminders: list[int] | None = Field(default=None, max_length=20)

    _aware = field_validator("starts_at", "ends_at")(require_aware)
    _timezone = field_validator("timezone")(
        lambda value: validate_timezone(value) if value is not None else value
    )
    _reminders = field_validator("reminders")(
        lambda value: validate_reminders(value) if value is not None else value
    )
    _recurrence = field_validator("recurrence_rule")(validate_recurrence_rule)

    @model_validator(mode="after")
    def required_values_not_null(self) -> CalendarEventPatch:
        nullable = {"description", "recurrence_rule"}
        for field in self.model_fields_set - nullable:
            if getattr(self, field) is None:
                raise ValueError(f"{field} cannot be null")
        return self


class FolderCreate(StrictSchema):
    name: str = Field(min_length=1, max_length=160)
    parent_id: uuid.UUID | None = None


class DocumentCreate(StrictSchema):
    title: str = Field(min_length=1, max_length=200)
    folder_id: uuid.UUID | None = None
    classification: DocumentClassification = DocumentClassification.internal
    owner_user_id: uuid.UUID | None = None


class DocumentPatch(StrictSchema):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    folder_id: uuid.UUID | None = None
    classification: DocumentClassification | None = None
    owner_user_id: uuid.UUID | None = None
    state: DocumentState | None = None


class DocumentVersionCreate(StrictSchema):
    content_type: str = Field(
        min_length=3,
        max_length=128,
        pattern=r"^[a-z0-9][a-z0-9.+-]+/[a-z0-9][a-z0-9.+-]+$",
    )
    byte_size: int = Field(gt=0, le=10_737_418_240, strict=True)
    sha256: SHA256
    rights_declaration: str = Field(min_length=10, max_length=500)


class ApprovalRequestCreate(StrictSchema):
    approver_user_id: uuid.UUID
    note: str | None = Field(default=None, max_length=1000)


class ApprovalDecision(StrictSchema):
    decision: Literal["approved", "rejected"]
    note: str | None = Field(default=None, max_length=1000)


class ESignatureCreate(StrictSchema):
    signer_emails: list[str] = Field(min_length=1, max_length=50)

    @field_validator("signer_emails")
    @classmethod
    def signer_addresses(cls, values: list[str]) -> list[str]:
        if any(not 3 <= len(value) <= 320 or "@" not in value for value in values):
            raise ValueError("invalid signer email")
        return list(dict.fromkeys(value.strip().lower() for value in values))


class BudgetCreate(StrictSchema):
    name: str = Field(min_length=1, max_length=160)
    amount_minor: int = Field(ge=0, strict=True)
    currency: Currency
    period_start: datetime
    period_end: datetime
    status: BudgetStatus = BudgetStatus.draft

    _aware = field_validator("period_start", "period_end")(require_aware)

    @model_validator(mode="after")
    def period(self) -> BudgetCreate:
        if self.period_end <= self.period_start:
            raise ValueError("period_end must be later than period_start")
        return self


class BudgetPatch(StrictSchema):
    name: str | None = Field(default=None, min_length=1, max_length=160)
    amount_minor: int | None = Field(default=None, ge=0, strict=True)
    status: BudgetStatus | None = None


class BudgetCategoryCreate(StrictSchema):
    budget_id: uuid.UUID
    name: str = Field(min_length=1, max_length=120)
    allocated_minor: int = Field(ge=0, strict=True)


class ExpenseCreate(StrictSchema):
    category_id: uuid.UUID | None = None
    vendor: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    amount_minor: int = Field(gt=0, strict=True)
    currency: Currency
    incurred_at: datetime
    receipt_object_key: str | None = Field(
        default=None,
        min_length=10,
        max_length=512,
        pattern=r"^business-documents/[A-Za-z0-9/_\-.]+$",
    )

    _aware = field_validator("incurred_at")(require_aware)


class ExpensePatch(StrictSchema):
    category_id: uuid.UUID | None = None
    vendor: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    amount_minor: int | None = Field(default=None, gt=0, strict=True)
    incurred_at: datetime | None = None
    receipt_object_key: str | None = Field(default=None, min_length=10, max_length=512)

    _aware = field_validator("incurred_at")(require_aware)


class ExpenseDecision(StrictSchema):
    decision: Literal["approved", "rejected"]
    reason: str | None = Field(default=None, max_length=1000)


class InvoiceLineCreate(StrictSchema):
    description: str = Field(min_length=1, max_length=1000)
    quantity: int = Field(gt=0, le=1_000_000, strict=True)
    unit_amount_minor: int = Field(ge=0, strict=True)


class InvoiceCreate(StrictSchema):
    number: str = Field(min_length=1, max_length=64, pattern=r"^[A-Za-z0-9][A-Za-z0-9._/-]*$")
    contact_id: uuid.UUID | None = None
    company_id: uuid.UUID | None = None
    currency: Currency
    tax_minor: int = Field(default=0, ge=0, strict=True)
    due_at: datetime | None = None
    lines: list[InvoiceLineCreate] = Field(min_length=1, max_length=500)

    _aware = field_validator("due_at")(require_aware)


class InvoicePatch(StrictSchema):
    contact_id: uuid.UUID | None = None
    company_id: uuid.UUID | None = None
    tax_minor: int | None = Field(default=None, ge=0, strict=True)
    due_at: datetime | None = None
    lines: list[InvoiceLineCreate] | None = Field(default=None, min_length=1, max_length=500)

    _aware = field_validator("due_at")(require_aware)


class ReconciliationCreate(StrictSchema):
    bank_reference: str = Field(min_length=3, max_length=255)
    evidence: str = Field(min_length=10, max_length=2000)
    amount_minor: int = Field(gt=0, strict=True)
    currency: Currency
    reconciled_at: datetime

    _aware = field_validator("reconciled_at")(require_aware)


class InvoicePaymentIntentCreate(StrictSchema):
    return_url: str = Field(min_length=10, max_length=2048, pattern=r"^https://")


class AdminUserAction(StrictSchema):
    reason: str = Field(min_length=5, max_length=1000)


class FeatureFlagCreate(StrictSchema):
    key: SettingKey
    environments: list[Literal["development", "test", "staging", "production"]] = Field(
        min_length=1, max_length=4
    )
    enabled: bool = False
    rollout_bps: int = Field(default=0, ge=0, le=10_000, strict=True)
    allow_subjects: list[str] = Field(default_factory=list, max_length=1000)
    deny_subjects: list[str] = Field(default_factory=list, max_length=1000)

    _subjects = field_validator("allow_subjects", "deny_subjects")(validate_flag_subjects)


class FeatureFlagPatch(StrictSchema):
    expected_version: int = Field(ge=1, strict=True)
    environments: list[Literal["development", "test", "staging", "production"]] | None = Field(
        default=None, min_length=1, max_length=4
    )
    enabled: bool | None = None
    rollout_bps: int | None = Field(default=None, ge=0, le=10_000, strict=True)
    allow_subjects: list[str] | None = Field(default=None, max_length=1000)
    deny_subjects: list[str] | None = Field(default=None, max_length=1000)

    _subjects = field_validator("allow_subjects", "deny_subjects")(
        lambda values: validate_flag_subjects(values) if values is not None else values
    )


class FeatureFlagEvaluation(StrictSchema):
    subject: str = Field(min_length=1, max_length=160)
    environment: Literal["development", "test", "staging", "production"]


class PlatformSettingUpdate(StrictSchema):
    expected_version: int | None = Field(default=None, ge=1, strict=True)
    value: dict[str, Any]
    secret: bool = False

    _value = field_validator("value")(validate_json)


class ServiceHealthIngest(StrictSchema):
    service: str = Field(
        min_length=2, max_length=96, pattern=r"^[a-z][a-z0-9]*(?:[-_.][a-z0-9]+)*$"
    )
    instance: str = Field(min_length=1, max_length=160)
    status: Literal["healthy", "degraded", "unavailable"]
    checks: dict[str, Any] = Field(default_factory=dict)
    observed_at: datetime

    _checks = field_validator("checks")(validate_json)
    _aware = field_validator("observed_at")(require_aware)
