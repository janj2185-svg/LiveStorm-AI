from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite+pysqlite:////tmp/sylora2.db"
    redis_url: str = "redis://127.0.0.1:6379/0"
    secret_key: str = "dev-only-change-me"
    internal_api_secret: str = "dev-internal-secret"
    openai_api_key: str | None = None
    openai_base_url: str = "https://api.openai.com/v1"
    openai_model: str = "gpt-4o-mini"
    cors_origins: str = "*"


@lru_cache
def get_settings() -> Settings:
    return Settings()
