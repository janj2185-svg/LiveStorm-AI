from fastapi import APIRouter

from platform_api.api.v1.admin import router as admin_router
from platform_api.api.v1.auth import router as auth_router
from platform_api.api.v1.clips import router as clips_router
from platform_api.api.v1.content import router as content_router
from platform_api.api.v1.health import router as health_router
from platform_api.api.v1.media import router as media_router
from platform_api.api.v1.profile import router as profile_router
from platform_api.api.v1.social import router as social_router
from platform_api.api.v1.ws import router as ws_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(auth_router)
api_router.include_router(profile_router)
api_router.include_router(content_router)
api_router.include_router(social_router)
api_router.include_router(admin_router)
api_router.include_router(media_router)
api_router.include_router(clips_router)
api_router.include_router(ws_router)
