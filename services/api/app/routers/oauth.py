from __future__ import annotations

import base64
import hashlib
import secrets
from typing import Any
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import JSONResponse, RedirectResponse
from joserfc import jwt as jose_jwt
from joserfc.errors import JoseError
from joserfc.jwk import KeySet
from joserfc.jwt import JWTClaimsRegistry
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit import add_audit_event
from app.auth_service import issue_token_pair
from app.config import OAuthProviderSettings, Settings
from app.dependencies import get_session, get_settings
from app.errors import APIError
from app.models import (
    AccountSettings,
    OAuthIdentity,
    Profile,
    Role,
    User,
    UserRole,
    UserStatus,
)
from app.security import (
    create_oauth_state,
    decode_oauth_state,
    normalize_email,
    utcnow,
)

router = APIRouter(prefix="/auth/oauth", tags=["OAuth"])
STATE_COOKIE = "sylora_oauth_state"


def provider_or_error(settings: Settings, provider: str) -> OAuthProviderSettings:
    configuration = settings.oauth_provider(provider)
    if configuration is None:
        raise APIError(
            503,
            "oauth_provider_unavailable",
            "OAuth provider unavailable",
            "This OAuth provider is not configured.",
        )
    return configuration


async def fetch_json(url: str, *, headers: dict[str, str] | None = None) -> dict[str, Any]:
    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=False) as client:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            data = response.json()
    except (httpx.HTTPError, ValueError) as exc:
        raise APIError(
            503,
            "oauth_provider_unavailable",
            "OAuth provider unavailable",
            "The OAuth provider could not be reached.",
        ) from exc
    if not isinstance(data, dict):
        raise APIError(
            503,
            "oauth_provider_unavailable",
            "OAuth provider unavailable",
            "The OAuth provider returned an invalid response.",
        )
    return data


@router.get("/{provider}/start")
async def oauth_start(
    provider: str,
    settings: Settings = Depends(get_settings),
) -> RedirectResponse:
    configuration = provider_or_error(settings, provider)
    discovery = await fetch_json(configuration.discovery_url)
    authorization_endpoint = discovery.get("authorization_endpoint")
    if not isinstance(authorization_endpoint, str):
        raise APIError(
            503,
            "oauth_provider_unavailable",
            "OAuth provider unavailable",
            "The OAuth provider metadata is incomplete.",
        )

    state = secrets.token_urlsafe(32)
    nonce = secrets.token_urlsafe(32)
    verifier = secrets.token_urlsafe(64)
    challenge = (
        base64.urlsafe_b64encode(hashlib.sha256(verifier.encode("ascii")).digest())
        .rstrip(b"=")
        .decode("ascii")
    )
    cookie = create_oauth_state(
        {
            "provider": configuration.name,
            "state": state,
            "nonce": nonce,
            "verifier": verifier,
        },
        settings,
    )
    query = urlencode(
        {
            "response_type": "code",
            "client_id": configuration.client_id,
            "redirect_uri": configuration.redirect_uri,
            "scope": configuration.scopes,
            "state": state,
            "nonce": nonce,
            "code_challenge": challenge,
            "code_challenge_method": "S256",
        }
    )
    response = RedirectResponse(f"{authorization_endpoint}?{query}", status_code=307)
    response.set_cookie(
        STATE_COOKIE,
        cookie,
        max_age=600,
        httponly=True,
        secure=True,
        samesite="lax",
        path=f"/v1/auth/oauth/{provider}",
    )
    return response


async def exchange_code(
    configuration: OAuthProviderSettings,
    discovery: dict[str, Any],
    code: str,
    verifier: str,
) -> dict[str, Any]:
    token_endpoint = discovery.get("token_endpoint")
    if not isinstance(token_endpoint, str):
        raise APIError(
            503,
            "oauth_provider_unavailable",
            "OAuth provider unavailable",
            "The OAuth provider metadata is incomplete.",
        )
    data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": configuration.redirect_uri,
        "client_id": configuration.client_id,
        "code_verifier": verifier,
    }
    methods = discovery.get("token_endpoint_auth_methods_supported", [])
    basic_auth: tuple[str, str] | None = None
    if "client_secret_basic" in methods:
        basic_auth = (
            configuration.client_id,
            configuration.client_secret.get_secret_value(),
        )
    else:
        data["client_secret"] = configuration.client_secret.get_secret_value()
    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=False) as client:
            if basic_auth is not None:
                response = await client.post(
                    token_endpoint,
                    data=data,
                    auth=basic_auth,
                    headers={"Accept": "application/json"},
                )
            else:
                response = await client.post(
                    token_endpoint,
                    data=data,
                    headers={"Accept": "application/json"},
                )
            response.raise_for_status()
            payload = response.json()
    except (httpx.HTTPError, ValueError) as exc:
        raise APIError(
            401,
            "oauth_exchange_failed",
            "OAuth authorization failed",
            "The provider authorization code could not be exchanged.",
        ) from exc
    if not isinstance(payload, dict):
        raise APIError(
            401,
            "oauth_exchange_failed",
            "OAuth authorization failed",
            "The provider returned an invalid token response.",
        )
    return payload


async def validated_claims(
    configuration: OAuthProviderSettings,
    discovery: dict[str, Any],
    token_payload: dict[str, Any],
    nonce: str,
) -> dict[str, Any]:
    id_token = token_payload.get("id_token")
    if isinstance(id_token, str):
        jwks_uri = discovery.get("jwks_uri")
        issuer = discovery.get("issuer")
        if not isinstance(jwks_uri, str) or not isinstance(issuer, str):
            raise APIError(
                503,
                "oauth_provider_unavailable",
                "OAuth provider unavailable",
                "The OAuth provider metadata is incomplete.",
            )
        jwks = await fetch_json(jwks_uri)
        try:
            supported = discovery.get("id_token_signing_alg_values_supported", ["RS256"])
            safe_algorithms = {
                "RS256",
                "RS384",
                "RS512",
                "PS256",
                "PS384",
                "PS512",
                "ES256",
                "ES384",
                "ES512",
                "EdDSA",
            }
            algorithms = [value for value in supported if value in safe_algorithms]
            if not algorithms:
                raise JoseError("provider has no supported signing algorithm")
            token = jose_jwt.decode(
                id_token,
                KeySet.import_key_set(jwks),  # type: ignore[arg-type]
                algorithms=algorithms,
            )
            claims_registry = JWTClaimsRegistry(
                leeway=60,
                iss={"essential": True, "value": issuer},
                aud={"essential": True, "value": configuration.client_id},
                sub={"essential": True},
                exp={"essential": True},
                nonce={"essential": True, "value": nonce},
            )
            claims_registry.validate(token.claims)
            return dict(token.claims)
        except JoseError as exc:
            raise APIError(
                401,
                "oauth_identity_invalid",
                "OAuth identity invalid",
                "The provider identity token could not be validated.",
            ) from exc

    userinfo_endpoint = discovery.get("userinfo_endpoint")
    access_token = token_payload.get("access_token")
    if not isinstance(userinfo_endpoint, str) or not isinstance(access_token, str):
        raise APIError(
            401,
            "oauth_identity_invalid",
            "OAuth identity invalid",
            "The provider did not supply a verifiable identity.",
        )
    return await fetch_json(userinfo_endpoint, headers={"Authorization": f"Bearer {access_token}"})


@router.get("/{provider}/callback")
async def oauth_callback(
    provider: str,
    request: Request,
    state: str = Query(min_length=32, max_length=256),
    code: str = Query(min_length=1, max_length=4096),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> JSONResponse:
    configuration = provider_or_error(settings, provider)
    cookie_value = request.cookies.get(STATE_COOKIE)
    if not cookie_value:
        raise APIError(
            400,
            "invalid_oauth_state",
            "Invalid OAuth state",
            "The OAuth authorization request is invalid or expired.",
        )
    state_data = decode_oauth_state(cookie_value, settings)
    if state_data.get("provider") != configuration.name or not secrets.compare_digest(
        str(state_data.get("state", "")), state
    ):
        raise APIError(
            400,
            "invalid_oauth_state",
            "Invalid OAuth state",
            "The OAuth authorization request is invalid or expired.",
        )

    discovery = await fetch_json(configuration.discovery_url)
    token_payload = await exchange_code(configuration, discovery, code, str(state_data["verifier"]))
    claims = await validated_claims(
        configuration, discovery, token_payload, str(state_data["nonce"])
    )
    subject = claims.get("sub")
    email_claim = claims.get("email")
    verified_claim = claims.get("email_verified")
    if (
        not isinstance(subject, str)
        or not isinstance(email_claim, str)
        or verified_claim not in {True, "true"}
    ):
        raise APIError(
            403,
            "oauth_email_unverified",
            "Verified provider email required",
            "The OAuth provider did not return a verified email address.",
        )
    email = normalize_email(email_claim)

    identity = await db.scalar(
        select(OAuthIdentity).where(
            OAuthIdentity.provider == configuration.name,
            OAuthIdentity.external_subject == subject,
        )
    )
    user = await db.get(User, identity.user_id) if identity else None
    if user is None:
        user = await db.scalar(select(User).where(User.email == email))
        if user is not None and user.status in {
            UserStatus.suspended,
            UserStatus.deleted,
        }:
            raise APIError(
                403,
                "account_unavailable",
                "Account unavailable",
                "This account cannot sign in with OAuth.",
            )
        if user is None:
            display_name = str(claims.get("name") or email.split("@", 1)[0])[:100]
            user = User(
                email=email,
                password_hash=None,
                status=UserStatus.active,
                email_verified_at=utcnow(),
            )
            user.profile = Profile(display_name=display_name)
            user.settings = AccountSettings()
            db.add(user)
            await db.flush()
            default_role = await db.scalar(select(Role).where(Role.name == "user"))
            if default_role is None:
                raise APIError(
                    503,
                    "service_not_ready",
                    "Service not ready",
                    "Identity roles have not been initialized.",
                )
            db.add(UserRole(user_id=user.id, role_id=default_role.id))
        elif user.status == UserStatus.pending:
            user.status = UserStatus.active
            user.email_verified_at = utcnow()
        identity = OAuthIdentity(
            user_id=user.id,
            provider=configuration.name,
            external_subject=subject,
            provider_email=email,
        )
        db.add(identity)
    if identity is None:
        raise APIError(
            500,
            "oauth_identity_unavailable",
            "OAuth identity unavailable",
            "The OAuth identity could not be persisted.",
        )
    if user.status != UserStatus.active:
        raise APIError(
            403,
            "account_unavailable",
            "Account unavailable",
            "This account cannot sign in with OAuth.",
        )
    identity.last_login_at = utcnow()
    tokens, access_session = await issue_token_pair(
        db, request, user, settings, f"{configuration.name.title()} OAuth"
    )
    add_audit_event(
        db,
        request,
        settings,
        "identity.oauth_login_succeeded",
        actor_user_id=user.id,
        target_user_id=user.id,
        metadata={
            "provider": configuration.name,
            "session_id": str(access_session.id),
        },
    )
    await db.commit()
    response = JSONResponse(tokens.model_dump())
    response.delete_cookie(
        STATE_COOKIE,
        path=f"/v1/auth/oauth/{provider}",
        secure=True,
        httponly=True,
        samesite="lax",
    )
    return response
