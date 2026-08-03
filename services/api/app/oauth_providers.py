"""Builtin OAuth metadata and provider-specific authorize/token helpers."""

from __future__ import annotations

from typing import Any
from urllib.parse import urlencode

from app.config import OAuthProviderSettings

BUILTIN_OAUTH_DISCOVERY: dict[str, dict[str, Any]] = {
    "github": {
        "issuer": "https://github.com",
        "authorization_endpoint": "https://github.com/login/oauth/authorize",
        "token_endpoint": "https://github.com/login/oauth/access_token",
        "userinfo_endpoint": "https://api.github.com/user",
        "token_endpoint_auth_methods_supported": ["client_secret_post"],
    },
    "tiktok": {
        "issuer": "https://www.tiktok.com",
        "authorization_endpoint": "https://www.tiktok.com/v2/auth/authorize/",
        "token_endpoint": "https://open.tiktokapis.com/v2/oauth/token/",
        "userinfo_endpoint": "https://open.tiktokapis.com/v2/user/info/",
        "token_endpoint_auth_methods_supported": ["client_secret_post"],
        "client_id_param": "client_key",
    },
    "facebook": {
        "issuer": "https://www.facebook.com",
        "authorization_endpoint": "https://www.facebook.com/v21.0/dialog/oauth",
        "token_endpoint": "https://graph.facebook.com/v21.0/oauth/access_token",
        "userinfo_endpoint": "https://graph.facebook.com/me",
        "token_endpoint_auth_methods_supported": ["client_secret_post"],
    },
}

# GitHub stays in the backend for development tooling only.
DEVELOPMENT_ONLY_OAUTH_PROVIDERS = frozenset({"github"})


def authorize_query(
    configuration: OAuthProviderSettings,
    discovery: dict[str, Any],
    *,
    state: str,
    nonce: str,
    challenge: str,
) -> str:
    client_param = discovery.get("client_id_param") or "client_id"
    params: dict[str, str] = {
        "response_type": "code",
        client_param: configuration.client_id,
        "redirect_uri": configuration.redirect_uri,
        "scope": configuration.scopes,
        "state": state,
        "code_challenge": challenge,
        "code_challenge_method": "S256",
    }
    if configuration.name not in {"tiktok", "facebook"}:
        params["nonce"] = nonce
    if configuration.name == "facebook":
        # Facebook uses comma-separated scopes in config; leave as-is.
        pass
    return urlencode(params)


def token_form(
    configuration: OAuthProviderSettings,
    discovery: dict[str, Any],
    *,
    code: str,
    verifier: str,
) -> dict[str, str]:
    if configuration.name == "tiktok":
        return {
            "client_key": configuration.client_id,
            "client_secret": configuration.client_secret.get_secret_value(),
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": configuration.redirect_uri,
            "code_verifier": verifier,
        }
    data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": configuration.redirect_uri,
        "client_id": configuration.client_id,
        "code_verifier": verifier,
    }
    methods = discovery.get("token_endpoint_auth_methods_supported", [])
    if "client_secret_basic" not in methods:
        data["client_secret"] = configuration.client_secret.get_secret_value()
    return data
