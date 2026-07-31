"""Structured logging with recursive secret redaction."""

from __future__ import annotations

import json
import logging
import re
import sys
from datetime import UTC, datetime
from typing import Any

SENSITIVE_KEYS = {
    "authorization",
    "credential",
    "obs_password",
    "pairing_code",
    "password",
    "secret",
    "signature",
    "token",
}
BEARER_PATTERN = re.compile(r"(?i)\bbearer\s+[A-Za-z0-9._~+/\-=]+")
ASSIGNMENT_PATTERN = re.compile(
    r"(?i)\b(password|token|credential|secret|signature|pairing_code)"
    r"(\s*[=:]\s*)"
    r"([^\s,;}]+)"
)


def _redact_text(value: str) -> str:
    without_bearer = BEARER_PATTERN.sub("Bearer [REDACTED]", value)
    return ASSIGNMENT_PATTERN.sub(r"\1\2[REDACTED]", without_bearer)


def redact(value: Any, key: str | None = None) -> Any:
    """Redact secrets in structured fields and common bearer-token text."""

    if key and any(part in key.lower() for part in SENSITIVE_KEYS):
        return "[REDACTED]"
    if isinstance(value, dict):
        return {
            str(item_key): redact(item_value, str(item_key))
            for item_key, item_value in value.items()
        }
    if isinstance(value, (list, tuple)):
        return [redact(item) for item in value]
    if isinstance(value, str):
        return _redact_text(value)
    return value


class JSONFormatter(logging.Formatter):
    """Emit one JSON object per line."""

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "timestamp": datetime.now(UTC).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": redact(record.getMessage()),
        }
        fields = getattr(record, "fields", None)
        if isinstance(fields, dict):
            payload["fields"] = redact(fields)
        if record.exc_info:
            payload["exception"] = _redact_text(self.formatException(record.exc_info))
        return json.dumps(payload, separators=(",", ":"), ensure_ascii=False)


def configure_logging(level: str = "INFO") -> None:
    """Install the companion JSON log handler."""

    handler = logging.StreamHandler(sys.stderr)
    handler.setFormatter(JSONFormatter())
    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(level.upper())
