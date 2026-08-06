from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class AuthorPublic(BaseModel):
    id: UUID
    handle: str
    display_name: str
    avatar_url: str | None = None


class PostCreateRequest(BaseModel):
    body: str = Field(min_length=1, max_length=5000)
    visibility: str = Field(default="public", pattern="^(public|followers)$")


class PostPublic(BaseModel):
    id: UUID
    body: str
    visibility: str
    author: AuthorPublic
    reaction_count: int
    comment_count: int
    viewer_reacted: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class PostListResponse(BaseModel):
    items: list[PostPublic]
    next_cursor: str | None = None


class CommentCreateRequest(BaseModel):
    body: str = Field(min_length=1, max_length=2000)
    parent_id: UUID | None = None


class CommentPublic(BaseModel):
    id: UUID
    body: str
    author: AuthorPublic
    parent_id: UUID | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ReactionRequest(BaseModel):
    target_type: str = Field(pattern="^(post|comment)$")
    target_id: UUID
    kind: str = Field(default="like", pattern="^(like|love|fire)$")
