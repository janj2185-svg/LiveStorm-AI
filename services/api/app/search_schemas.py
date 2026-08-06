from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.business_models import DocumentClassification, DocumentState
from app.gift_models import GiftTier
from app.live_models import LiveSessionState
from app.music_schemas import MusicTrackResponse
from app.platform_models import ProductKind, SettlementMethod
from app.social_schemas import CommunityResponse, PostResponse, PublicProfileResponse


class StrictSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")


class GiftSearchItem(StrictSchema):
    id: uuid.UUID
    slug: str
    name: str
    description: str
    tier: GiftTier
    price_minor: int


class MarketplaceProductSearchItem(StrictSchema):
    id: uuid.UUID
    slug: str
    title: str
    description: str
    category: str
    kind: ProductKind


class CourseSearchItem(StrictSchema):
    id: uuid.UUID
    slug: str
    title: str
    description: str
    category: str
    settlement_method: SettlementMethod


class LiveSessionSearchItem(StrictSchema):
    id: uuid.UUID
    owner_user_id: uuid.UUID
    title: str
    language: str
    state: LiveSessionState
    started_at: datetime | None


class DocumentSearchItem(StrictSchema):
    id: uuid.UUID
    workspace_id: uuid.UUID
    title: str
    state: DocumentState
    classification: DocumentClassification
    updated_at: datetime


class GlobalSearchResponse(StrictSchema):
    query: str
    users: list[PublicProfileResponse]
    posts: list[PostResponse]
    communities: list[CommunityResponse]
    gifts: list[GiftSearchItem]
    marketplace_products: list[MarketplaceProductSearchItem]
    courses: list[CourseSearchItem]
    live_sessions: list[LiveSessionSearchItem]
    music_tracks: list[MusicTrackResponse]
    documents: list[DocumentSearchItem]
