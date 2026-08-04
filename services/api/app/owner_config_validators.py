"""Live connection validators for owner-configured providers."""

from __future__ import annotations

import json
import re
from typing import Any
from urllib.parse import urlparse

import aiosmtplib
import httpx

from app.owner_config_catalog import OwnerProviderSpec


class OwnerValidationError(ValueError):
    def __init__(self, message: str, *, details: dict[str, Any] | None = None) -> None:
        super().__init__(message)
        self.details = details or {}


def _require(values: dict[str, str], *keys: str) -> None:
    missing = [key for key in keys if not values.get(key, "").strip()]
    if missing:
        raise OwnerValidationError(
            f"Missing required fields: {', '.join(missing)}",
            details={"missing": missing},
        )


def _as_bool(value: str | None, default: bool = True) -> bool:
    if value is None or value == "":
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def validate_field_shapes(spec: OwnerProviderSpec, values: dict[str, str]) -> None:
    for field in spec.fields:
        raw = values.get(field.key, "")
        if field.required and not str(raw).strip() and field.default is None:
            # Allow omit when an existing secret is being kept (handled upstream).
            if field.secret:
                continue
            raise OwnerValidationError(f"{field.label} is required")
        if not str(raw).strip():
            continue
        if field.kind == "url":
            parsed = urlparse(str(raw).strip())
            if parsed.scheme not in {"http", "https"} or not parsed.netloc:
                raise OwnerValidationError(f"{field.label} must be a valid http(s) URL")
        elif field.kind == "email":
            if "@" not in str(raw) or "." not in str(raw).split("@")[-1]:
                raise OwnerValidationError(f"{field.label} must be a valid email")
        elif field.kind == "number":
            try:
                float(str(raw))
            except ValueError as exc:
                raise OwnerValidationError(f"{field.label} must be a number") from exc
        elif field.kind == "json":
            try:
                json.loads(str(raw))
            except json.JSONDecodeError as exc:
                raise OwnerValidationError(f"{field.label} must be valid JSON") from exc
        elif field.kind == "boolean":
            if str(raw).strip().lower() not in {"1", "0", "true", "false", "yes", "no", "on", "off"}:
                raise OwnerValidationError(f"{field.label} must be true/false")


async def test_provider_connection(
    provider_key: str,
    values: dict[str, str],
    *,
    timeout: float = 20.0,
) -> dict[str, Any]:
    key = provider_key.lower().strip()
    if key == "openai":
        return await _test_openai(values, timeout=timeout)
    if key == "smtp":
        return await _test_smtp(values, timeout=timeout)
    if key == "stripe":
        return await _test_stripe(values, timeout=timeout)
    if key == "s3":
        return await _test_s3(values)
    if key == "fcm":
        return _test_fcm(values)
    if key.endswith("_oauth") or key in {
        "google_oauth",
        "apple_oauth",
        "facebook_oauth",
        "tiktok_oauth",
    }:
        return _test_oauth(values)
    if key == "sentry":
        return _test_sentry(values)
    if key == "translation":
        return await _test_translation(values, timeout=timeout)
    if key == "speech_to_text":
        return await _test_stt(values, timeout=timeout)
    if key == "text_to_speech":
        return await _test_tts(values, timeout=timeout)
    if key == "maps":
        return await _test_maps(values, timeout=timeout)
    if key == "analytics":
        return _test_analytics(values)
    if key == "custom":
        _require(values, "integration_name")
        return {"ok": True, "message": "Custom integration stored (format OK)"}
    raise OwnerValidationError(f"Unknown provider: {provider_key}")


async def _test_openai(values: dict[str, str], *, timeout: float) -> dict[str, Any]:
    _require(values, "api_key")
    api_key = values["api_key"].strip()
    if not api_key.startswith("sk-"):
        raise OwnerValidationError("OpenAI API key should start with sk-")
    base = (values.get("base_url") or "https://api.openai.com/v1").rstrip("/")
    async with httpx.AsyncClient(timeout=timeout) as client:
        response = await client.get(
            f"{base}/models",
            headers={"Authorization": f"Bearer {api_key}"},
        )
    if response.status_code >= 400:
        raise OwnerValidationError(
            f"OpenAI rejected the key (HTTP {response.status_code})",
            details={"status_code": response.status_code},
        )
    data = response.json()
    count = len(data.get("data", [])) if isinstance(data, dict) else 0
    return {"ok": True, "message": f"OpenAI connected ({count} models visible)", "models": count}


async def _test_smtp(values: dict[str, str], *, timeout: float) -> dict[str, Any]:
    _require(values, "host", "username", "password", "from_email")
    port = int(values.get("port") or "587")
    start_tls = _as_bool(values.get("start_tls"), True)
    use_tls = _as_bool(values.get("use_tls"), False)
    if start_tls and use_tls:
        raise OwnerValidationError("STARTTLS and TLS cannot both be enabled")
    smtp = aiosmtplib.SMTP(
        hostname=values["host"].strip(),
        port=port,
        start_tls=start_tls,
        use_tls=use_tls,
        timeout=timeout,
    )
    await smtp.connect()
    try:
        await smtp.login(values["username"].strip(), values["password"].strip())
    finally:
        try:
            await smtp.quit()
        except Exception:  # noqa: BLE001
            pass
    return {"ok": True, "message": f"SMTP auth OK at {values['host']}:{port}"}


async def _test_stripe(values: dict[str, str], *, timeout: float) -> dict[str, Any]:
    _require(values, "secret_key", "webhook_secret")
    secret = values["secret_key"].strip()
    if not secret.startswith(("sk_live_", "sk_test_")):
        raise OwnerValidationError("Stripe secret key must start with sk_live_ or sk_test_")
    if not values["webhook_secret"].strip().startswith("whsec_"):
        raise OwnerValidationError("Stripe webhook secret must start with whsec_")
    async with httpx.AsyncClient(timeout=timeout) as client:
        response = await client.get(
            "https://api.stripe.com/v1/balance",
            auth=(secret, ""),
        )
    if response.status_code >= 400:
        raise OwnerValidationError(
            f"Stripe rejected the secret key (HTTP {response.status_code})",
            details={"status_code": response.status_code},
        )
    mode = "test" if secret.startswith("sk_test_") else "live"
    return {"ok": True, "message": f"Stripe connected ({mode} mode)"}


async def _test_s3(values: dict[str, str]) -> dict[str, Any]:
    _require(values, "endpoint_url", "bucket", "access_key_id", "secret_access_key")
    import asyncio

    import boto3
    from botocore.config import Config
    from botocore.exceptions import BotoCoreError, ClientError

    def _head() -> None:
        client = boto3.client(
            "s3",
            endpoint_url=values["endpoint_url"].strip(),
            region_name=(values.get("region") or "auto").strip() or "auto",
            aws_access_key_id=values["access_key_id"].strip(),
            aws_secret_access_key=values["secret_access_key"].strip(),
            config=Config(signature_version="s3v4"),
        )
        client.head_bucket(Bucket=values["bucket"].strip())

    try:
        await asyncio.to_thread(_head)
    except (ClientError, BotoCoreError, Exception) as exc:  # noqa: BLE001
        raise OwnerValidationError(f"S3/R2 connection failed: {exc}") from exc
    return {"ok": True, "message": f"Bucket reachable: {values['bucket']}"}


def _test_fcm(values: dict[str, str]) -> dict[str, Any]:
    _require(values, "project_id", "service_account_json")
    try:
        payload = json.loads(values["service_account_json"])
    except json.JSONDecodeError as exc:
        raise OwnerValidationError("FCM service account must be valid JSON") from exc
    if not isinstance(payload, dict):
        raise OwnerValidationError("FCM service account JSON must be an object")
    required = {"type", "project_id", "private_key", "client_email"}
    missing = sorted(required - set(payload))
    if missing:
        raise OwnerValidationError(
            f"FCM service account missing fields: {', '.join(missing)}",
            details={"missing": missing},
        )
    if payload.get("type") != "service_account":
        raise OwnerValidationError("FCM JSON type must be service_account")
    if payload.get("project_id") != values["project_id"].strip():
        raise OwnerValidationError("FCM project_id does not match the JSON project_id")
    return {"ok": True, "message": f"FCM service account valid for {values['project_id']}"}


def _test_oauth(values: dict[str, str]) -> dict[str, Any]:
    _require(values, "client_id", "client_secret", "redirect_uri")
    redirect = values["redirect_uri"].strip()
    parsed = urlparse(redirect)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise OwnerValidationError("redirect_uri must be a valid URL")
    if len(values["client_id"].strip()) < 8:
        raise OwnerValidationError("client_id looks too short")
    if len(values["client_secret"].strip()) < 8:
        raise OwnerValidationError("client_secret looks too short")
    return {"ok": True, "message": "OAuth credentials format OK"}


def _test_sentry(values: dict[str, str]) -> dict[str, Any]:
    _require(values, "dsn")
    dsn = values["dsn"].strip()
    parsed = urlparse(dsn)
    if parsed.scheme not in {"http", "https"} or "@" not in dsn or "sentry" not in dsn.lower():
        # Allow self-hosted without 'sentry' in host if path looks like DSN
        if parsed.scheme not in {"http", "https"} or "@" not in dsn:
            raise OwnerValidationError("Sentry DSN format looks invalid")
    return {"ok": True, "message": "Sentry DSN format OK"}


async def _test_translation(values: dict[str, str], *, timeout: float) -> dict[str, Any]:
    _require(values, "api_key")
    provider = (values.get("provider") or "deepl").strip().lower()
    api_key = values["api_key"].strip()
    if provider == "openai":
        return await _test_openai(
            {"api_key": api_key, "base_url": values.get("base_url") or "https://api.openai.com/v1"},
            timeout=timeout,
        )
    base = (values.get("base_url") or "https://api-free.deepl.com").rstrip("/")
    async with httpx.AsyncClient(timeout=timeout) as client:
        response = await client.get(
            f"{base}/v2/usage",
            headers={"Authorization": f"DeepL-Auth-Key {api_key}"},
        )
    if response.status_code >= 400:
        raise OwnerValidationError(
            f"DeepL rejected the key (HTTP {response.status_code})",
            details={"status_code": response.status_code},
        )
    return {"ok": True, "message": "DeepL connected"}


async def _test_stt(values: dict[str, str], *, timeout: float) -> dict[str, Any]:
    _require(values, "api_key")
    provider = (values.get("provider") or "openai").strip().lower()
    if provider == "deepgram":
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.get(
                "https://api.deepgram.com/v1/projects",
                headers={"Authorization": f"Token {values['api_key'].strip()}"},
            )
        if response.status_code >= 400:
            raise OwnerValidationError(
                f"Deepgram rejected the key (HTTP {response.status_code})",
                details={"status_code": response.status_code},
            )
        return {"ok": True, "message": "Deepgram STT connected"}
    return await _test_openai(
        {"api_key": values["api_key"], "base_url": values.get("base_url") or "https://api.openai.com/v1"},
        timeout=timeout,
    )


async def _test_tts(values: dict[str, str], *, timeout: float) -> dict[str, Any]:
    _require(values, "api_key")
    provider = (values.get("provider") or "openai").strip().lower()
    if provider == "elevenlabs":
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.get(
                "https://api.elevenlabs.io/v1/user",
                headers={"xi-api-key": values["api_key"].strip()},
            )
        if response.status_code >= 400:
            raise OwnerValidationError(
                f"ElevenLabs rejected the key (HTTP {response.status_code})",
                details={"status_code": response.status_code},
            )
        return {"ok": True, "message": "ElevenLabs TTS connected"}
    return await _test_openai(
        {"api_key": values["api_key"], "base_url": values.get("base_url") or "https://api.openai.com/v1"},
        timeout=timeout,
    )


async def _test_maps(values: dict[str, str], *, timeout: float) -> dict[str, Any]:
    _require(values, "api_key")
    provider = (values.get("provider") or "mapbox").strip().lower()
    token = values["api_key"].strip()
    if provider == "google":
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.get(
                "https://maps.googleapis.com/maps/api/geocode/json",
                params={"address": "Kyiv", "key": token},
            )
        payload = response.json()
        status = payload.get("status") if isinstance(payload, dict) else None
        if status not in {"OK", "ZERO_RESULTS"}:
            raise OwnerValidationError(f"Google Maps key invalid ({status})")
        return {"ok": True, "message": "Google Maps key OK"}
    async with httpx.AsyncClient(timeout=timeout) as client:
        response = await client.get(
            f"https://api.mapbox.com/geocoding/v5/mapbox.places/kyiv.json",
            params={"access_token": token, "limit": 1},
        )
    if response.status_code >= 400:
        raise OwnerValidationError(
            f"Mapbox rejected the token (HTTP {response.status_code})",
            details={"status_code": response.status_code},
        )
    return {"ok": True, "message": "Mapbox token OK"}


def _test_analytics(values: dict[str, str]) -> dict[str, Any]:
    provider = (values.get("provider") or "posthog").strip().lower()
    api_key = (values.get("api_key") or "").strip()
    if provider == "ga4":
        if api_key and not re.match(r"^G-[A-Z0-9]+$", api_key):
            raise OwnerValidationError("GA4 measurement ID should look like G-XXXXXXXX")
        return {"ok": True, "message": "Analytics (GA4) format OK"}
    if provider == "plausible":
        return {"ok": True, "message": "Analytics (Plausible) config stored"}
    if not api_key:
        raise OwnerValidationError("PostHog project API key is required")
    if len(api_key) < 12:
        raise OwnerValidationError("Analytics API key looks too short")
    return {"ok": True, "message": "Analytics (PostHog) format OK"}
