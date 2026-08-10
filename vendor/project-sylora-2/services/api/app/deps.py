from __future__ import annotations

from fastapi import Depends, Header, HTTPException

from app.config import Settings, get_settings


def current_user_id(
    x_sylora_user_id: str | None = Header(default=None, alias="X-Sylora-User-Id"),
    x_sylora_internal_secret: str | None = Header(default=None, alias="X-Sylora-Internal-Secret"),
    settings: Settings = Depends(get_settings),
) -> str:
    """BFF auth bridge: Next.js session → FastAPI via internal secret + user id.

    Production must never expose this header to browsers without the BFF.
    """
    if not x_sylora_user_id:
        raise HTTPException(status_code=401, detail="missing_user")
    if x_sylora_internal_secret != settings.internal_api_secret:
        raise HTTPException(status_code=401, detail="invalid_internal_secret")
    return x_sylora_user_id.strip()
