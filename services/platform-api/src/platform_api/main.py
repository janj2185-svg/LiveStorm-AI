import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from platform_api import __version__
from platform_api.api.v1.router import api_router
from platform_api.config import get_settings

structlog.configure(processors=[structlog.processors.JSONRenderer()])


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title=settings.app_name,
        version=__version__,
        docs_url="/docs",
        redoc_url="/redoc",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(api_router, prefix=settings.api_prefix)
    return app


app = create_app()
