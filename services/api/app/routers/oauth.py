from __future__ import annotations

import base64
import hashlib
import secrets
from typing import Any
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
from app.oauth_providers import (
    BUILTIN_OAUTH_DISCOVERY,
    DEVELOPMENT_ONLY_OAUTH_PROVIDERS,
    authorize_query,
    token_form,
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
    name = provider.lower().strip()
    if name in DEVELOPMENT_ONLY_OAUTH_PROVIDERS and settings.environment not in {
        "development",
        "test",
    }:
        raise APIError(
            503,
            "oauth_provider_unavailable",
            "OAuth provider unavailable",
            "This OAuth provider is not available for consumer sign-in.",
        )
    configuration = settings.oauth_provider(name)
    if configuration is None:
        raise APIError(
            503,
            "oauth_provider_unavailable",
            "OAuth provider unavailable",
            "This OAuth provider is not configured.",
        )
    return configuration


async def fetch_json(url: str, *, headers: dict[str, str] | None = None) -> dict[str, Any]:
    if url.startswith("builtin:"):
        key = url.removeprefix("builtin:").strip().lower()
        data = BUILTIN_OAUTH_DISCOVERY.get(key)
        if data is None:
            raise APIError(
                503,
                "oauth_provider_unavailable",
                "OAuth provider unavailable",
                "The OAuth provider metadata is incomplete.",
            )
        return dict(data)
    try:
        request_headers = {"Accept": "application/json", "User-Agent": "sylora-api"}
        if headers:
            request_headers.update(headers)
        async with httpx.AsyncClient(timeout=15, follow_redirects=False) as client:
            response = await client.get(url, headers=request_headers)
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
    query = authorize_query(
        configuration,
        discovery,
        state=state,
        nonce=nonce,
        challenge=challenge,
    )
    response = RedirectResponse(f"{authorization_endpoint}?{query}", status_code=307)
    response.set_cookie(
        STATE_COOKIE,
        cookie,
        max_age=600,
        httponly=True,
        secure=True,
        samesite="lax",
        path=f"/v1/auth/oauth/{configuration.name}",
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
    data = token_form(configuration, discovery, code=code, verifier=verifier)
    methods = discovery.get("token_endpoint_auth_methods_supported", [])
    basic_auth: tuple[str, str] | None = None
    if "client_secret_basic" in methods and configuration.name not in {"tiktok"}:
        basic_auth = (
            configuration.client_id,
            configuration.client_secret.get_secret_value(),
        )
        data.pop("client_secret", None)
    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=False) as client:
            if basic_auth is not None:
                response = await client.post(
                    token_endpoint,
                    data=data,
                    auth=basic_auth,
                    headers={"Accept": "application/json", "User-Agent": "sylora-api"},
                )
            else:
                response = await client.post(
                    token_endpoint,
                    data=data,
                    headers={"Accept": "application/json", "User-Agent": "sylora-api"},
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
    # TikTok nests token fields under data.
    if configuration.name == "tiktok" and isinstance(payload.get("data"), dict):
        nested = dict(payload["data"])
        nested.setdefault("access_token", nested.get("access_token"))
        return nested
    return payload


async def _provider_userinfo(
    configuration: OAuthProviderSettings,
    discovery: dict[str, Any],
    access_token: str,
) -> dict[str, Any]:
    userinfo_endpoint = discovery.get("userinfo_endpoint")
    if not isinstance(userinfo_endpoint, str):
        raise APIError(
            401,
            "oauth_identity_invalid",
            "OAuth identity invalid",
            "The provider did not supply a verifiable identity.",
        )
    if configuration.name == "facebook":
        url = f"{userinfo_endpoint}?fields=id,name,email&access_token={access_token}"
        data = await fetch_json(url)
        if "id" in data and "sub" not in data:
            data["sub"] = str(data["id"])
        if data.get("email"):
            data["email_verified"] = True
        return data
    if configuration.name == "tiktok":
        url = f"{userinfo_endpoint}?fields=open_id,union_id,display_name,avatar_url"
        data = await fetch_json(url, headers={"Authorization": f"Bearer {access_token}"})
        user = data.get("data", {}).get("user") if isinstance(data.get("data"), dict) else None
        if not isinstance(user, dict):
            raise APIError(
                401,
                "oauth_identity_invalid",
                "OAuth identity invalid",
                "The provider did not supply a verifiable identity.",
            )
        subject = user.get("open_id") or user.get("union_id")
        return {
            "sub": str(subject) if subject else None,
            "name": user.get("display_name"),
            "email": None,
            "email_verified": False,
        }
    if configuration.name == "github":
        data = await fetch_json(
            userinfo_endpoint,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if "id" in data and "sub" not in data:
            data["sub"] = str(data["id"])
        return data
    return await fetch_json(
        userinfo_endpoint, headers={"Authorization": f"Bearer {access_token}"}
    )


async def fetch_json_list(
    url: str, *, headers: dict[str, str] | None = None
) -> list[dict[str, Any]]:
    try:
        request_headers = {"Accept": "application/json", "User-Agent": "sylora-api"}
        if headers:
            request_headers.update(headers)
        async with httpx.AsyncClient(timeout=15, follow_redirects=False) as client:
            response = await client.get(url, headers=request_headers)
            response.raise_for_status()
            data = response.json()
    except (httpx.HTTPError, ValueError) as exc:
        raise APIError(
            401,
            "oauth_identity_invalid",
            "OAuth identity invalid",
            "The provider did not supply a verifiable identity.",
        ) from exc
    if not isinstance(data, list):
        raise APIError(
            401,
            "oauth_identity_invalid",
            "OAuth identity invalid",
            "The provider did not supply a verifiable identity.",
        )
    return [item for item in data if isinstance(item, dict)]


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

    access_token = token_payload.get("access_token")
    if not isinstance(access_token, str):
        raise APIError(
            401,
            "oauth_identity_invalid",
            "OAuth identity invalid",
            "The provider did not supply a verifiable identity.",
        )
    claims = await _provider_userinfo(configuration, discovery, access_token)
    if configuration.name == "github":
        emails = await fetch_json_list(
            "https://api.github.com/user/emails",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        selected = next(
            (
                item
                for item in emails
                if item.get("primary") is True and item.get("verified") is True
            ),
            None,
        )
        if selected is None:
            selected = next((item for item in emails if item.get("verified") is True), None)
        if selected and isinstance(selected.get("email"), str):
            claims["email"] = selected["email"]
            claims["email_verified"] = True
        if claims.get("id") is not None and not claims.get("sub"):
            claims["sub"] = str(claims["id"])
    return claims


async def resolve_oauth_user(
    db: AsyncSession,
    configuration: OAuthProviderSettings,
    claims: dict[str, Any],
) -> tuple[User, OAuthIdentity]:
    subject = claims.get("sub")
    if not isinstance(subject, str) or not subject:
        raise APIError(
            401,
            "oauth_identity_invalid",
            "OAuth identity invalid",
            "The provider did not supply a verifiable identity.",
        )

    email: str | None = None
    email_verified = claims.get("email_verified") in {True, "true"}
    email_claim = claims.get("email")
    if isinstance(email_claim, str) and email_claim.strip() and email_verified:
        email = normalize_email(email_claim)

    identity = await db.scalar(
        select(OAuthIdentity).where(
            OAuthIdentity.provider == configuration.name,
            OAuthIdentity.external_subject == subject,
        )
    )
    user = await db.get(User, identity.user_id) if identity else None
    if user is not None:
        return user, identity

    # Only auto-link by email when the provider asserted a verified email.
    if email is not None:
        user = await db.scalar(select(User).where(User.email == email))
        if user is not None and user.status in {UserStatus.suspended, UserStatus.deleted}:
            raise APIError(
                403,
                "account_unavailable",
                "Account unavailable",
                "This account cannot sign in with OAuth.",
            )
        if user is not None and user.email_verified_at is None:
            # Do not merge into an unverified local email account.
            user = None

    if user is None:
        display_name = str(
            claims.get("name") or (email.split("@", 1)[0] if email else configuration.name)
        )[:100]
        user = User(
            email=email,
            password_hash=None,
            status=UserStatus.active,
            email_verified_at=utcnow() if email else None,
        )
        user.profile = Profile(display_name=display_name, locale="uk")
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
        if email and user.email_verified_at is None:
            user.email_verified_at = utcnow()

    identity = OAuthIdentity(
        user_id=user.id,
        provider=configuration.name,
        external_subject=subject,
        provider_email=email,
    )
    db.add(identity)
    return user, identity


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
    user, identity = await resolve_oauth_user(db, configuration, claims)
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
    bundle = create_oauth_state(
        {
            "tokens": tokens.model_dump(),
            "provider": configuration.name,
        },
        settings,
    )
    wants_json = "application/json" in (request.headers.get("accept") or "").lower()
    if wants_json:
        response: JSONResponse | RedirectResponse = JSONResponse(tokens.model_dump())
    else:
        redirect_target = (
            f"{settings.web_base_url.rstrip('/')}/auth/oauth/complete"
            f"?provider={configuration.name}"
        )
        response = RedirectResponse(redirect_target, status_code=303)
    response.set_cookie(
        "sylora_oauth_bundle",
        bundle,
        max_age=120,
        httponly=True,
        secure=settings.environment != "test",
        samesite="lax",
        path="/v1/auth/oauth",
    )
    response.delete_cookie(
        STATE_COOKIE,
        path=f"/v1/auth/oauth/{configuration.name}",
        secure=True,
        httponly=True,
        samesite="lax",
    )
    return response


@router.get("/session-complete", response_model=None)
async def oauth_session_complete(
    request: Request,
    settings: Settings = Depends(get_settings),
) -> JSONResponse:
    """Exchange the short-lived HttpOnly OAuth bundle cookie for tokens once."""
    bundle = request.cookies.get("sylora_oauth_bundle")
    if not bundle:
        raise APIError(
            401,
            "oauth_session_missing",
            "OAuth session missing",
            "Complete the provider sign-in again.",
        )
    payload = decode_oauth_state(bundle, settings)
    tokens = payload.get("tokens")
    if not isinstance(tokens, dict):
        raise APIError(
            401,
            "oauth_session_missing",
            "OAuth session missing",
            "Complete the provider sign-in again.",
        )
    response = JSONResponse(tokens)
    response.delete_cookie(
        "sylora_oauth_bundle",
        path="/v1/auth/oauth",
        secure=settings.environment != "test",
        httponly=True,
        samesite="lax",
    )
    return response
