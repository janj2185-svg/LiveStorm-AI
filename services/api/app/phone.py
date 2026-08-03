"""Phone number normalization helpers (E.164)."""

from __future__ import annotations

import re

from app.errors import APIError

_E164_RE = re.compile(r"^\+[1-9]\d{7,14}$")
_DIGITS_RE = re.compile(r"\d+")


def normalize_phone_e164(value: str, *, default_region: str | None = None) -> str:
    """Normalize user input to E.164.

    Accepts already-E.164 values, or national numbers with an optional default
    region prefix (e.g. ``UA`` → ``+380``). Does not invent country codes when
    the region is unknown.
    """
    raw = (value or "").strip().replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    if not raw:
        raise APIError(
            422,
            "invalid_phone",
            "Invalid phone number",
            "Enter a valid phone number in international format.",
        )
    if raw.startswith("00"):
        raw = f"+{raw[2:]}"
    if raw.startswith("+"):
        digits = "".join(_DIGITS_RE.findall(raw[1:]))
        candidate = f"+{digits}"
    else:
        digits = "".join(_DIGITS_RE.findall(raw))
        region = (default_region or "").strip().upper()
        prefixes = {
            "UA": "380",
            "US": "1",
            "GB": "44",
            "PL": "48",
        }
        prefix = prefixes.get(region)
        if prefix is None:
            raise APIError(
                422,
                "invalid_phone",
                "Invalid phone number",
                "Enter a phone number with a country code, for example +380…",
            )
        if digits.startswith(prefix):
            candidate = f"+{digits}"
        elif digits.startswith("0"):
            candidate = f"+{prefix}{digits.lstrip('0')}"
        else:
            candidate = f"+{prefix}{digits}"
    if not _E164_RE.fullmatch(candidate):
        raise APIError(
            422,
            "invalid_phone",
            "Invalid phone number",
            "Enter a valid phone number in international format.",
        )
    return candidate
