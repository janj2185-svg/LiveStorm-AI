"""SMS delivery boundary for phone authentication.

No Twilio/Vonage credentials are bundled. Until a real provider is configured,
phone authentication must remain unavailable — never fake a successful send.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from app.config import Settings
from app.errors import APIError


class SmsProvider(ABC):
    @abstractmethod
    async def send_otp(self, *, phone_e164: str, message: str) -> None:
        """Deliver an OTP message. Must not log the message body in production."""


class UnconfiguredSmsProvider(SmsProvider):
    async def send_otp(self, *, phone_e164: str, message: str) -> None:
        raise APIError(
            503,
            "phone_auth_unavailable",
            "Phone authentication unavailable",
            "SMS delivery is not configured for this deployment.",
        )


class LoggingDevSmsProvider(SmsProvider):
    """Development/test only — never selected in staging/production."""

    def __init__(self) -> None:
        self.sent: list[dict[str, str]] = []

    async def send_otp(self, *, phone_e164: str, message: str) -> None:
        # Tests inspect the message; production code paths never construct this.
        self.sent.append({"phone": phone_e164, "message": message})


def sms_configured(settings: Settings) -> bool:
    return bool(
        settings.sms_provider
        and settings.sms_provider not in {"", "none", "unconfigured"}
        and settings.sms_api_key is not None
        and settings.sms_api_key.get_secret_value().strip()
        and settings.sms_from_number
        and settings.sms_from_number.strip()
    )


def require_sms_capability(settings: Settings) -> None:
    if sms_configured(settings):
        return
    raise APIError(
        503,
        "phone_auth_unavailable",
        "Phone authentication unavailable",
        "SMS delivery is not configured for this deployment.",
    )


def build_sms_provider(settings: Settings) -> SmsProvider:
    if not sms_configured(settings):
        return UnconfiguredSmsProvider()
    provider = (settings.sms_provider or "").strip().lower()
    if provider == "twilio":
        return TwilioSmsProvider(settings)
    if provider == "vonage":
        return VonageSmsProvider(settings)
    raise APIError(
        503,
        "phone_auth_unavailable",
        "Phone authentication unavailable",
        "The configured SMS provider is not supported.",
    )


class TwilioSmsProvider(SmsProvider):
    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    async def send_otp(self, *, phone_e164: str, message: str) -> None:
        import httpx

        account_sid = self._settings.sms_account_sid
        api_key = self._settings.sms_api_key
        if not account_sid or api_key is None:
            raise APIError(
                503,
                "phone_auth_unavailable",
                "Phone authentication unavailable",
                "SMS delivery is not configured for this deployment.",
            )
        url = (
            f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json"
        )
        auth = (account_sid, api_key.get_secret_value())
        data = {
            "To": phone_e164,
            "From": self._settings.sms_from_number,
            "Body": message,
        }
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                response = await client.post(url, data=data, auth=auth)
                response.raise_for_status()
        except httpx.HTTPError as exc:
            raise APIError(
                503,
                "phone_auth_unavailable",
                "Phone authentication unavailable",
                "SMS delivery failed.",
            ) from exc


class VonageSmsProvider(SmsProvider):
    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    async def send_otp(self, *, phone_e164: str, message: str) -> None:
        import httpx

        api_key = self._settings.sms_api_key
        api_secret = self._settings.sms_api_secret
        if api_key is None or api_secret is None:
            raise APIError(
                503,
                "phone_auth_unavailable",
                "Phone authentication unavailable",
                "SMS delivery is not configured for this deployment.",
            )
        payload: dict[str, Any] = {
            "api_key": api_key.get_secret_value(),
            "api_secret": api_secret.get_secret_value(),
            "to": phone_e164.lstrip("+"),
            "from": self._settings.sms_from_number,
            "text": message,
        }
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                response = await client.post(
                    "https://rest.nexmo.com/sms/json", json=payload
                )
                response.raise_for_status()
                body = response.json()
        except (httpx.HTTPError, ValueError) as exc:
            raise APIError(
                503,
                "phone_auth_unavailable",
                "Phone authentication unavailable",
                "SMS delivery failed.",
            ) from exc
        messages = body.get("messages") if isinstance(body, dict) else None
        status = None
        if isinstance(messages, list) and messages:
            first = messages[0]
            if isinstance(first, dict):
                status = first.get("status")
        if status not in {"0", 0}:
            raise APIError(
                503,
                "phone_auth_unavailable",
                "Phone authentication unavailable",
                "SMS delivery failed.",
            )
