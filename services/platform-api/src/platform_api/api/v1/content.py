from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from platform_api.api.deps import get_current_user
from platform_api.domains.content.schemas import (
    CommentCreateRequest,
    CommentPublic,
    PostCreateRequest,
    PostListResponse,
    PostPublic,
    ReactionRequest,
)
from platform_api.domains.content.service import ContentService
from platform_api.domains.identity.models import User
from platform_api.infrastructure.database import get_db

router = APIRouter(tags=["content"])


@router.post("/posts", response_model=PostPublic, status_code=status.HTTP_201_CREATED)
async def create_post(
    payload: PostCreateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PostPublic:
    return await ContentService(db).create_post(user, payload)


@router.get("/posts/{post_id}", response_model=PostPublic)
async def get_post(
    post_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PostPublic:
    return await ContentService(db).get_post(post_id, user.id)


@router.get("/feed", response_model=PostListResponse)
async def get_feed(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(default=20, ge=1, le=50),
    cursor: str | None = None,
) -> PostListResponse:
    items, next_cursor = await ContentService(db).feed(user.id, limit=limit, cursor=cursor)
    return PostListResponse(items=items, next_cursor=next_cursor)


@router.get("/explore", response_model=PostListResponse)
async def get_explore(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(default=20, ge=1, le=50),
) -> PostListResponse:
    items = await ContentService(db).explore(user.id, limit=limit)
    return PostListResponse(items=items)


@router.post("/posts/{post_id}/comments", response_model=CommentPublic, status_code=status.HTTP_201_CREATED)
async def create_comment(
    post_id: UUID,
    payload: CommentCreateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CommentPublic:
    return await ContentService(db).add_comment(user, post_id, payload.body, payload.parent_id)


@router.get("/posts/{post_id}/comments", response_model=list[CommentPublic])
async def list_comments(
    post_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[CommentPublic]:
    return await ContentService(db).list_comments(post_id, user.id)


@router.post("/reactions")
async def toggle_reaction(
    payload: ReactionRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, int | bool]:
    return await ContentService(db).toggle_reaction(
        user, payload.target_type, payload.target_id, payload.kind
    )


@router.get("/search")
async def search(
    q: str = Query(min_length=2),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    return await ContentService(db).search(q)
