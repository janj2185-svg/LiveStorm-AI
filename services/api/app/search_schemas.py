from __future__ import annotations

import uuid
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class StrictSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")


class SearchHit(StrictSchema):
    id: uuid.UUID
    title: str
    subtitle: str | None = None
    handle: str | None = None
    slug: str | None = None
    extra: dict[str, Any] = Field(default_factory=dict)


class SearchSection(StrictSchema):
    type: Literal[
        "users",
        "posts",
        "communities",
        "gifts",
        "products",
        "courses",
        "live_sessions",
        "music",
    ]
    items: list[SearchHit]


class SearchResponse(StrictSchema):
    query: str
    sections: list[SearchSection]
