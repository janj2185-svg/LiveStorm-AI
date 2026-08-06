from __future__ import annotations

import re
import unicodedata
import uuid
from datetime import datetime
from typing import Annotated, Literal
from urllib.parse import urlparse

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.social_models import (
    CommunityRole,
    CommunityVisibility,
    ConversationState,
    MembershipStatus,
    ParticipantState,
    PostKind,
    PostLifecycle,
    PostVisibility,
    ReactionValue,
    ReportStatus,
)

HANDLE_PATTERN = re.compile(r"^[a-z0-9._]{3,30}$")
SLUG_PATTERN = re.compile(r"^[a-z0-9]+(?:[._-][a-z0-9]+)*$")
RESERVED_HANDLES = frozenset(
    {
        "admin",
        "administrator",
        "api",
        "auth",
        "business",
        "communities",
        "community",
        "creator",
        "help",
        "me",
        "messages",
        "moderator",
        "moderators",
        "notifications",
        "null",
        "official",
        "profile",
        "profiles",
        "root",
        "security",
        "social",
        "support",
        "sylora",
        "system",
        "undefined",
        "user",
        "users",
        "www",
    }
)


def validate_handle(value: str) -> str:
    if not HANDLE_PATTERN.fullmatch(value):
        raise ValueError("handle must be 3-30 lowercase letters, digits, dots, or underscores")
    if value in RESERVED_HANDLES:
        raise ValueError("handle is reserved")
    return value


def validate_plain_text(value: str) -> str:
    if any(
        unicodedata.category(character) == "Cc" and character not in "\n\r\t" for character in value
    ):
        raise ValueError("control characters are not allowed")
    if re.search(r"<\s*/?\s*[a-zA-Z][^>]*>", value):
        raise ValueError("HTML markup is not allowed")
    return value


def validate_reference(value: str) -> str:
    parsed = urlparse(value)
    if parsed.scheme == "https" and parsed.netloc and not parsed.username and not parsed.password:
        return value
    if (
        parsed.scheme == "s3"
        and parsed.netloc
        and parsed.path not in {"", "/"}
        and not parsed.username
        and not parsed.password
    ):
        return value
    raise ValueError("reference must be an HTTPS URL or an s3://bucket/key URI")


class StrictSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ORMStrictSchema(StrictSchema):
    model_config = ConfigDict(extra="forbid", from_attributes=True)


class MediaReference(StrictSchema):
    url: str = Field(min_length=6, max_length=2048)
    media_type: Literal["image", "video"]
    alt_text: str | None = Field(default=None, max_length=500)
    width: int | None = Field(default=None, ge=1, le=32768)
    height: int | None = Field(default=None, ge=1, le=32768)

    _safe_url = field_validator("url")(validate_reference)
    _plain_alt = field_validator("alt_text")(
        lambda value: validate_plain_text(value) if value else value
    )


class PublicProfileResponse(ORMStrictSchema):
    user_id: uuid.UUID
    handle: str
    display_name: str
    bio: str | None
    avatar_url: str | None
    visibility: Literal["private", "public"]
    followed_by_viewer: bool = False
    friend_with_viewer: bool = False


class RelationResponse(StrictSchema):
    id: uuid.UUID | None = None
    status: str
    target_handle: str


class CommunityCreate(StrictSchema):
    slug: str = Field(min_length=3, max_length=64)
    name: str = Field(min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=4000)
    visibility: CommunityVisibility = CommunityVisibility.public

    @field_validator("slug")
    @classmethod
    def valid_slug(cls, value: str) -> str:
        if not SLUG_PATTERN.fullmatch(value):
            raise ValueError("slug must be lowercase and URL-safe")
        return value

    _plain_name = field_validator("name")(validate_plain_text)
    _plain_description = field_validator("description")(
        lambda value: validate_plain_text(value) if value else value
    )


class CommunityPatch(StrictSchema):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=4000)
    visibility: CommunityVisibility | None = None

    _plain_name = field_validator("name")(
        lambda value: validate_plain_text(value) if value else value
    )
    _plain_description = field_validator("description")(
        lambda value: validate_plain_text(value) if value else value
    )

    @model_validator(mode="after")
    def required_values_cannot_be_null(self) -> CommunityPatch:
        for field in {"name", "visibility"} & self.model_fields_set:
            if getattr(self, field) is None:
                raise ValueError(f"{field} cannot be null")
        return self


class CommunityResponse(ORMStrictSchema):
    id: uuid.UUID
    slug: str
    name: str
    description: str | None
    visibility: CommunityVisibility
    created_by_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    viewer_role: CommunityRole | None = None
    viewer_membership_status: MembershipStatus | None = None


class ChannelCreate(StrictSchema):
    slug: str = Field(min_length=1, max_length=64)
    name: str = Field(min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=500)

    @field_validator("slug")
    @classmethod
    def valid_slug(cls, value: str) -> str:
        if not SLUG_PATTERN.fullmatch(value):
            raise ValueError("slug must be lowercase and URL-safe")
        return value

    _plain_name = field_validator("name")(validate_plain_text)
    _plain_description = field_validator("description")(
        lambda value: validate_plain_text(value) if value else value
    )


class ChannelPatch(StrictSchema):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=500)

    _plain_name = field_validator("name")(
        lambda value: validate_plain_text(value) if value else value
    )
    _plain_description = field_validator("description")(
        lambda value: validate_plain_text(value) if value else value
    )

    @model_validator(mode="after")
    def name_cannot_be_null(self) -> ChannelPatch:
        if "name" in self.model_fields_set and self.name is None:
            raise ValueError("name cannot be null")
        return self


class ChannelResponse(ORMStrictSchema):
    id: uuid.UUID
    community_id: uuid.UUID
    slug: str
    name: str
    description: str | None
    created_at: datetime


class MembershipResponse(ORMStrictSchema):
    id: uuid.UUID
    community_id: uuid.UUID
    user_id: uuid.UUID
    role: CommunityRole
    status: MembershipStatus
    created_at: datetime


class MembershipRolePatch(StrictSchema):
    role: CommunityRole


class PollOptionCreate(StrictSchema):
    text: str = Field(min_length=1, max_length=200)

    _plain_text = field_validator("text")(validate_plain_text)


class PollCreate(StrictSchema):
    options: list[PollOptionCreate] = Field(min_length=2, max_length=10)
    closes_at: datetime | None = None

    @field_validator("closes_at")
    @classmethod
    def timezone_required(cls, value: datetime | None) -> datetime | None:
        if value is not None and value.tzinfo is None:
            raise ValueError("closes_at must include a timezone")
        return value


class PostCreate(StrictSchema):
    kind: PostKind = PostKind.text
    body: str = Field(default="", max_length=20_000)
    media_references: list[MediaReference] = Field(default_factory=list, max_length=12)
    link_url: str | None = Field(default=None, max_length=2048)
    category: str | None = Field(default=None, pattern=r"^[a-z0-9][a-z0-9_-]{1,63}$")
    visibility: PostVisibility = PostVisibility.public
    lifecycle: Literal[PostLifecycle.draft, PostLifecycle.published] = PostLifecycle.draft
    community_id: uuid.UUID | None = None
    channel_id: uuid.UUID | None = None
    poll: PollCreate | None = None

    _plain_body = field_validator("body")(validate_plain_text)
    _safe_link = field_validator("link_url")(
        lambda value: validate_reference(value) if value else value
    )

    @model_validator(mode="after")
    def kind_matches_payload(self) -> PostCreate:
        if self.kind == PostKind.poll and self.poll is None:
            raise ValueError("poll posts require poll options")
        if self.kind != PostKind.poll and self.poll is not None:
            raise ValueError("poll options are valid only for poll posts")
        if self.kind in {PostKind.image, PostKind.video} and not self.media_references:
            raise ValueError("media posts require media references")
        if self.kind == PostKind.link and self.link_url is None:
            raise ValueError("link posts require link_url")
        if not self.body and self.kind == PostKind.text:
            raise ValueError("text posts require a body")
        if self.channel_id is not None and self.community_id is None:
            raise ValueError("channel_id requires community_id")
        if self.visibility == PostVisibility.community and self.community_id is None:
            raise ValueError("community visibility requires community_id")
        return self


class PostPatch(StrictSchema):
    body: str | None = Field(default=None, max_length=20_000)
    media_references: list[MediaReference] | None = Field(default=None, max_length=12)
    link_url: str | None = Field(default=None, max_length=2048)
    category: str | None = Field(default=None, pattern=r"^[a-z0-9][a-z0-9_-]{1,63}$")
    visibility: PostVisibility | None = None
    lifecycle: Literal[PostLifecycle.draft, PostLifecycle.archived] | None = None

    _plain_body = field_validator("body")(
        lambda value: validate_plain_text(value) if value else value
    )
    _safe_link = field_validator("link_url")(
        lambda value: validate_reference(value) if value else value
    )

    @model_validator(mode="after")
    def required_values_cannot_be_null(self) -> PostPatch:
        for field in {
            "body",
            "media_references",
            "visibility",
            "lifecycle",
        } & self.model_fields_set:
            if getattr(self, field) is None:
                raise ValueError(f"{field} cannot be null")
        return self


class PollOptionResponse(ORMStrictSchema):
    id: uuid.UUID
    text: str
    position: int
    closes_at: datetime | None
    vote_count: int = 0
    viewer_voted: bool = False


class PostResponse(ORMStrictSchema):
    id: uuid.UUID
    author_id: uuid.UUID
    author_handle: str
    community_id: uuid.UUID | None
    channel_id: uuid.UUID | None
    kind: PostKind
    body: str
    media_references: list[MediaReference]
    link_url: str | None
    category: str | None
    visibility: PostVisibility
    lifecycle: PostLifecycle
    created_at: datetime
    published_at: datetime | None
    edited_at: datetime | None
    poll_options: list[PollOptionResponse] = Field(default_factory=list)
    reaction_count: int = 0
    comment_count: int = 0
    repost_count: int = 0
    viewer_reaction: ReactionValue | None = None
    bookmarked: bool = False


class PostPageResponse(StrictSchema):
    items: list[PostResponse]
    next_cursor: str | None


class RecommendationResponse(StrictSchema):
    post: PostResponse
    score: float
    explanations: list[str]


class CommentCreate(StrictSchema):
    body: str = Field(min_length=1, max_length=5000)

    _plain_body = field_validator("body")(validate_plain_text)


class CommentPatch(StrictSchema):
    body: str = Field(min_length=1, max_length=5000)

    _plain_body = field_validator("body")(validate_plain_text)


class CommentResponse(ORMStrictSchema):
    id: uuid.UUID
    post_id: uuid.UUID
    author_id: uuid.UUID
    author_handle: str
    parent_id: uuid.UUID | None
    body: str
    created_at: datetime
    edited_at: datetime | None
    deleted_at: datetime | None


class ReactionRequest(StrictSchema):
    value: ReactionValue


class ReactionResponse(ORMStrictSchema):
    id: uuid.UUID
    target_type: Literal["post", "comment"]
    target_id: uuid.UUID
    value: ReactionValue


class PollVoteRequest(StrictSchema):
    option_id: uuid.UUID


class PollVoteResponse(StrictSchema):
    post_id: uuid.UUID
    option_id: uuid.UUID
    status: Literal["recorded"] = "recorded"


class SearchQuery(StrictSchema):
    query: Annotated[str, Field(min_length=2, max_length=100)]


class UserSearchResponse(StrictSchema):
    items: list[PublicProfileResponse]
    page: int
    has_more: bool


class CommunitySearchResponse(StrictSchema):
    items: list[CommunityResponse]
    page: int
    has_more: bool


class PostSearchResponse(StrictSchema):
    items: list[PostResponse]
    page: int
    has_more: bool


class NotificationResponse(ORMStrictSchema):
    id: uuid.UUID
    notification_type: str
    actor_user_id: uuid.UUID | None
    target_type: str | None
    target_id: uuid.UUID | None
    event_metadata: dict[str, str | int | float | bool | None]
    created_at: datetime
    read_at: datetime | None
    muted_at: datetime | None


class NotificationPageResponse(StrictSchema):
    items: list[NotificationResponse]
    next_cursor: str | None


class NotificationMuteRequest(StrictSchema):
    muted: bool


class NotificationPreferenceResponse(ORMStrictSchema):
    notification_type: str
    muted: bool
    updated_at: datetime


class ReportCreate(StrictSchema):
    target_type: Literal["user", "post", "comment", "message", "community"]
    target_id: uuid.UUID
    reason: Literal[
        "spam",
        "harassment",
        "hate",
        "violence",
        "sexual_content",
        "misinformation",
        "impersonation",
        "other",
    ]
    evidence: str | None = Field(default=None, max_length=5000)

    _plain_evidence = field_validator("evidence")(
        lambda value: validate_plain_text(value) if value else value
    )


class ReportResponse(ORMStrictSchema):
    id: uuid.UUID
    reporter_id: uuid.UUID
    target_type: str
    target_id: uuid.UUID
    reason: str
    evidence: str | None
    status: ReportStatus
    created_at: datetime
    updated_at: datetime


class ReportPageResponse(StrictSchema):
    items: list[ReportResponse]
    next_cursor: str | None


class ModerationDecisionRequest(StrictSchema):
    status: Literal[ReportStatus.resolved, ReportStatus.dismissed]
    action: Literal["none", "warn", "hide_content", "suspend_user", "remove_content"]
    notes: str | None = Field(default=None, max_length=5000)

    _plain_notes = field_validator("notes")(
        lambda value: validate_plain_text(value) if value else value
    )


class ConversationCreate(StrictSchema):
    recipient_handle: str

    _valid_handle = field_validator("recipient_handle")(validate_handle)


class ConversationParticipantResponse(ORMStrictSchema):
    user_id: uuid.UUID
    state: ParticipantState
    joined_at: datetime
    last_read_at: datetime | None


class ConversationResponse(ORMStrictSchema):
    id: uuid.UUID
    state: ConversationState
    created_by_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    participants: list[ConversationParticipantResponse] = Field(default_factory=list)


def validate_https_url(value: str) -> str:
    parsed = urlparse(value)
    if parsed.scheme != "https" or not parsed.netloc or parsed.username or parsed.password:
        raise ValueError("media_url must be an HTTPS URL")
    return value


class StoryCreate(StrictSchema):
    media_url: str = Field(min_length=8, max_length=2048)
    caption: str | None = Field(default=None, max_length=500)

    _https_media = field_validator("media_url")(validate_https_url)
    _plain_caption = field_validator("caption")(
        lambda value: validate_plain_text(value) if value else value
    )


class StoryItemResponse(ORMStrictSchema):
    id: uuid.UUID
    author_id: uuid.UUID
    media_url: str
    caption: str | None
    created_at: datetime
    expires_at: datetime
    viewed_by_viewer: bool = False


class StoryAuthorGroup(StrictSchema):
    author_id: uuid.UUID
    author_handle: str | None = None
    author_display_name: str | None = None
    stories: list[StoryItemResponse]


class StoryFeedResponse(StrictSchema):
    groups: list[StoryAuthorGroup]


class StoryViewResponse(StrictSchema):
    story_id: uuid.UUID
    viewed_at: datetime


class MessageCreate(StrictSchema):
    body: str = Field(min_length=1, max_length=10_000)
    attachment_url: str | None = Field(default=None, max_length=2048)

    _plain_body = field_validator("body")(validate_plain_text)
    _safe_attachment = field_validator("attachment_url")(
        lambda value: validate_reference(value) if value else value
    )


class MessagePatch(StrictSchema):
    body: str = Field(min_length=1, max_length=10_000)

    _plain_body = field_validator("body")(validate_plain_text)


class MessageResponse(ORMStrictSchema):
    id: uuid.UUID
    conversation_id: uuid.UUID | None
    channel_id: uuid.UUID | None
    sender_id: uuid.UUID
    body: str
    attachment_url: str | None
    created_at: datetime
    edited_at: datetime | None
    deleted_at: datetime | None


class MessagePageResponse(StrictSchema):
    items: list[MessageResponse]
    next_cursor: str | None


class ReadReceiptRequest(StrictSchema):
    through_message_id: uuid.UUID


class ReadReceiptResponse(StrictSchema):
    conversation_id: uuid.UUID
    through_message_id: uuid.UUID
    read_at: datetime


class WebSocketEvent(StrictSchema):
    event: Literal["message", "message_edited", "message_deleted", "read", "heartbeat"]
    cursor: str | None = None
    message: MessageResponse | None = None
    conversation_id: uuid.UUID | None = None
    user_id: uuid.UUID | None = None
    event_metadata: dict[str, str] = Field(default_factory=dict)
    occurred_at: datetime
