"""Media-plane helpers for SYLORA Live.

The existing live control plane keeps two ingestion paths:

* OBS companion / RTMP-style external encoders remain controlled through
  `OBSAdapter` and reveal-once stream keys.
* Browser publishing uses MediaMTX WHIP when the deployment provides a real
  MediaMTX Control API plus a public WHIP base URL. This module never invents
  URLs: unconfigured deployments return an explicit unavailable capability.

The bearer token minted here is a short-lived SYLORA publish assertion for the
session ingest path. Deployments can enforce it at the MediaMTX edge with
authHTTP / reverse-proxy checks while MediaMTX owns the actual WHIP endpoint.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import timedelta
from typing import Literal
from urllib.parse import quote

import jwt

from app.config import Settings
from app.live_models import LiveSession
from app.security import utcnow

PUBLISH_TOKEN_SECONDS = 5 * 60

MediaCapabilityStatus = Literal["available", "unavailable"]


@dataclass(frozen=True)
class IceServer:
    urls: tuple[str, ...]
    username: str | None = None
    credential: str | None = None


@dataclass(frozen=True)
class MediaCapability:
    status: MediaCapabilityStatus
    reason: str | None
    whip_available: bool
    playback_available: bool
    obs_available: bool = True


@dataclass(frozen=True)
class PublishCredentials:
    capability: MediaCapability
    whip_url: str | None
    playback_url: str | None
    bearer_token: str | None
    token_expires_at: object | None
    token_expires_in_seconds: int
    ice_servers: tuple[IceServer, ...]


def media_capability(settings: Settings, live_session: LiveSession) -> MediaCapability:
    """Report whether browser WHIP publishing can be offered for this session."""
    if not settings.mediamtx_control_url:
        return MediaCapability(
            status="unavailable",
            reason="mediamtx_control_unconfigured",
            whip_available=False,
            playback_available=False,
        )
    if not settings.mediamtx_whip_base_url:
        return MediaCapability(
            status="unavailable",
            reason="mediamtx_whip_unconfigured",
            whip_available=False,
            playback_available=bool(settings.mediamtx_playback_base_url),
        )
    if not live_session.ingest_provisioned:
        return MediaCapability(
            status="unavailable",
            reason="stream_path_not_provisioned",
            whip_available=False,
            playback_available=bool(settings.mediamtx_playback_base_url),
        )
    return MediaCapability(
        status="available",
        reason=None,
        whip_available=True,
        playback_available=bool(settings.mediamtx_playback_base_url),
    )


def publish_credentials(
    settings: Settings,
    live_session: LiveSession,
    *,
    ingest_path: str | None = None,
    subject_user_id: uuid.UUID | None = None,
    token_type: str = "live_whip_publish",
) -> PublishCredentials:
    """Return MediaMTX WHIP publish credentials, fail-closed when unavailable."""
    capability = media_capability(settings, live_session)
    if capability.status != "available":
        return PublishCredentials(
            capability=capability,
            whip_url=None,
            playback_url=None,
            bearer_token=None,
            token_expires_at=None,
            token_expires_in_seconds=0,
            ice_servers=ice_servers(settings),
        )

    expires_at = utcnow() + timedelta(seconds=PUBLISH_TOKEN_SECONDS)
    effective_path = ingest_path or live_session.ingest_path
    return PublishCredentials(
        capability=capability,
        whip_url=_media_url(settings.mediamtx_whip_base_url, effective_path, "whip"),
        playback_url=_media_url(settings.mediamtx_playback_base_url, effective_path),
        bearer_token=_publish_token(
            settings,
            live_session,
            expires_at,
            ingest_path=effective_path,
            subject_user_id=subject_user_id,
            token_type=token_type,
        ),
        token_expires_at=expires_at,
        token_expires_in_seconds=PUBLISH_TOKEN_SECONDS,
        ice_servers=ice_servers(settings),
    )


def ice_servers(settings: Settings) -> tuple[IceServer, ...]:
    if not settings.turn_urls:
        return ()
    return (
        IceServer(
            urls=tuple(settings.turn_urls),
            username=settings.turn_username,
            credential=settings.turn_credential.get_secret_value()
            if settings.turn_credential
            else None,
        ),
    )


def _media_url(base_url: str | None, ingest_path: str, suffix: str | None = None) -> str | None:
    if not base_url:
        return None
    path = quote(ingest_path.strip("/"), safe="/")
    if suffix:
        path = f"{path}/{suffix.strip('/')}"
    return f"{base_url.rstrip('/')}/{path}"


def _publish_token(
    settings: Settings,
    live_session: LiveSession,
    expires_at: object,
    *,
    ingest_path: str,
    subject_user_id: uuid.UUID | None,
    token_type: str,
) -> str:
    payload = {
        "sub": str(subject_user_id or live_session.owner_user_id),
        "sid": str(live_session.id),
        "path": ingest_path,
        "type": token_type,
        "jti": str(uuid.uuid4()),
        "iat": utcnow(),
        "nbf": utcnow(),
        "exp": expires_at,
        "iss": settings.jwt_issuer,
        "aud": settings.jwt_audience,
    }
    return jwt.encode(payload, settings.jwt_secret.get_secret_value(), algorithm="HS256")
