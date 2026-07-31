"""Configuration parsing and network-boundary validation."""

from __future__ import annotations

import ipaddress
import os
from dataclasses import dataclass, field
from pathlib import Path
from urllib.parse import urlparse


class ConfigurationError(ValueError):
    """Raised when configuration would weaken the companion boundary."""


def _bool_env(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    normalized = value.strip().lower()
    if normalized in {"1", "true", "yes", "on"}:
        return True
    if normalized in {"0", "false", "no", "off"}:
        return False
    raise ConfigurationError(f"{name} must be a boolean")


def _csv_env(name: str, default: tuple[str, ...] = ()) -> tuple[str, ...]:
    raw = os.getenv(name)
    if raw is None:
        return default
    return tuple(part.strip() for part in raw.split(",") if part.strip())


def _int_env(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, str(default)))
    except ValueError as exc:
        raise ConfigurationError(f"{name} must be an integer") from exc


def _float_env(name: str, default: float) -> float:
    try:
        return float(os.getenv(name, str(default)))
    except ValueError as exc:
        raise ConfigurationError(f"{name} must be a number") from exc


def _private_obs_url(value: str) -> str:
    parsed = urlparse(value)
    if parsed.scheme not in {"ws", "wss"} or not parsed.hostname:
        raise ConfigurationError("OBS_WS_URL must be a ws:// or wss:// URL")
    if parsed.username or parsed.query or parsed.fragment:
        raise ConfigurationError("OBS_WS_URL must not contain credentials, query, or fragment")
    if parsed.hostname == "localhost":
        return value
    try:
        address = ipaddress.ip_address(parsed.hostname)
    except ValueError as exc:
        raise ConfigurationError(
            "OBS_WS_URL host must be localhost or a loopback/private IP literal"
        ) from exc
    if not (address.is_loopback or address.is_private):
        raise ConfigurationError("OBS_WS_URL must target loopback or a private LAN address")
    return value


def _secure_url(name: str, value: str | None, schemes: set[str]) -> str | None:
    if not value:
        return None
    parsed = urlparse(value)
    if parsed.scheme not in schemes or not parsed.hostname:
        expected = "/".join(sorted(schemes))
        raise ConfigurationError(f"{name} must use {expected}")
    if parsed.username or parsed.password or parsed.fragment:
        raise ConfigurationError(f"{name} must not embed credentials or fragments")
    return value.rstrip("/")


def _bind_address(value: str) -> ipaddress.IPv4Address | ipaddress.IPv6Address:
    try:
        return ipaddress.ip_address(value)
    except ValueError as exc:
        raise ConfigurationError("BIND_HOST must be an IP literal") from exc


@dataclass(frozen=True, slots=True)
class Settings:
    """Validated environment-backed settings."""

    bind_host: str = "127.0.0.1"
    bind_port: int = 8765
    allow_lan: bool = False
    tls_cert: Path | None = None
    tls_key: Path | None = None
    lan_cidrs: tuple[str, ...] = ()
    allowed_hosts: tuple[str, ...] = ("127.0.0.1", "localhost", "[::1]")
    cors_origin: str = "http://127.0.0.1:5173"
    obs_ws_url: str = "ws://127.0.0.1:4455"
    obs_password: str = ""
    obs_request_timeout: float = 8.0
    obs_pending_limit: int = 128
    obs_event_subscriptions: int = 0xFFFFFFFF
    cloud_api_url: str | None = None
    cloud_ws_url: str | None = None
    cloud_capabilities: frozenset[str] = field(default_factory=frozenset)
    confirmation_actions: frozenset[str] = field(
        default_factory=lambda: frozenset(
            {
                "stream.start",
                "stream.stop",
                "record.start",
                "record.stop",
                "virtual_camera.start",
                "virtual_camera.stop",
            }
        )
    )
    confirmation_timeout: float = 30.0
    update_manifest_url: str | None = None
    update_public_key: str | None = None
    state_dir: Path = field(
        default_factory=lambda: Path.home() / ".local" / "share" / "sylora-companion"
    )
    body_limit_bytes: int = 65_536
    rate_limit_per_minute: int = 120

    def __post_init__(self) -> None:
        address = _bind_address(self.bind_host)
        if not 1 <= self.bind_port <= 65535:
            raise ConfigurationError("BIND_PORT must be between 1 and 65535")
        if not address.is_loopback:
            if not self.allow_lan:
                raise ConfigurationError(
                    "non-loopback bind refused; set ALLOW_LAN=true with TLS and CIDRs"
                )
            if not self.tls_cert or not self.tls_key:
                raise ConfigurationError("LAN binding requires TLS_CERT and TLS_KEY")
            if not self.lan_cidrs:
                raise ConfigurationError("LAN binding requires LAN_CIDRS")
            for cidr in self.lan_cidrs:
                try:
                    ipaddress.ip_network(cidr, strict=False)
                except ValueError as exc:
                    raise ConfigurationError(f"invalid LAN_CIDRS entry: {cidr}") from exc
        if self.allow_lan and (not self.tls_cert or not self.tls_key or not self.lan_cidrs):
            raise ConfigurationError("ALLOW_LAN requires TLS_CERT, TLS_KEY, and LAN_CIDRS")
        if self.allow_lan and self.tls_cert and self.tls_key:
            if not self.tls_cert.is_file() or not self.tls_key.is_file():
                raise ConfigurationError("TLS_CERT and TLS_KEY must be readable files")
            if os.name == "posix" and self.tls_key.stat().st_mode & 0o077:
                raise ConfigurationError("TLS_KEY must not be accessible by group or other users")
        cors = urlparse(self.cors_origin)
        if cors.scheme not in {"http", "https"} or not cors.hostname:
            raise ConfigurationError("CORS_ORIGIN must be one explicit HTTP(S) origin")
        if (
            "*" in self.cors_origin
            or "," in self.cors_origin
            or cors.username
            or cors.password
            or cors.path
            or cors.query
            or cors.fragment
        ):
            raise ConfigurationError("CORS_ORIGIN cannot contain wildcards or multiple origins")
        _private_obs_url(self.obs_ws_url)
        _secure_url("CLOUD_API_URL", self.cloud_api_url, {"https"})
        _secure_url("CLOUD_WS_URL", self.cloud_ws_url, {"wss"})
        if bool(self.cloud_api_url) != bool(self.cloud_ws_url):
            raise ConfigurationError("CLOUD_API_URL and CLOUD_WS_URL must be configured together")
        _secure_url("UPDATE_MANIFEST_URL", self.update_manifest_url, {"https"})
        if (
            self.body_limit_bytes < 1
            or self.rate_limit_per_minute < 1
            or self.obs_request_timeout <= 0
            or self.obs_pending_limit < 1
            or self.confirmation_timeout <= 0
            or not 0 <= self.obs_event_subscriptions <= 0xFFFFFFFFFFFFFFFF
        ):
            raise ConfigurationError("one or more numeric limits are out of range")

    @classmethod
    def from_env(cls) -> Settings:
        """Build settings from environment without accepting unknown configuration implicitly."""

        cert = os.getenv("TLS_CERT")
        key = os.getenv("TLS_KEY")
        return cls(
            bind_host=os.getenv("BIND_HOST", "127.0.0.1"),
            bind_port=_int_env("BIND_PORT", 8765),
            allow_lan=_bool_env("ALLOW_LAN"),
            tls_cert=Path(cert).expanduser() if cert else None,
            tls_key=Path(key).expanduser() if key else None,
            lan_cidrs=_csv_env("LAN_CIDRS"),
            allowed_hosts=_csv_env(
                "ALLOWED_HOSTS", ("127.0.0.1", "localhost", "[::1]")
            ),
            cors_origin=os.getenv("CORS_ORIGIN", "http://127.0.0.1:5173"),
            obs_ws_url=_private_obs_url(os.getenv("OBS_WS_URL", "ws://127.0.0.1:4455")),
            obs_password=os.getenv("OBS_WS_PASSWORD", ""),
            obs_request_timeout=_float_env("OBS_REQUEST_TIMEOUT", 8),
            obs_pending_limit=_int_env("OBS_PENDING_LIMIT", 128),
            obs_event_subscriptions=_int_env("OBS_EVENT_SUBSCRIPTIONS", 4294967295),
            cloud_api_url=_secure_url("CLOUD_API_URL", os.getenv("CLOUD_API_URL"), {"https"}),
            cloud_ws_url=_secure_url("CLOUD_WS_URL", os.getenv("CLOUD_WS_URL"), {"wss"}),
            cloud_capabilities=frozenset(_csv_env("CLOUD_CAPABILITIES")),
            confirmation_actions=frozenset(
                _csv_env(
                    "CONFIRMATION_ACTIONS",
                    (
                        "stream.start",
                        "stream.stop",
                        "record.start",
                        "record.stop",
                        "virtual_camera.start",
                        "virtual_camera.stop",
                    ),
                )
            ),
            confirmation_timeout=_float_env("CONFIRMATION_TIMEOUT", 30),
            update_manifest_url=_secure_url(
                "UPDATE_MANIFEST_URL", os.getenv("UPDATE_MANIFEST_URL"), {"https"}
            ),
            update_public_key=os.getenv("UPDATE_PUBLIC_KEY"),
            state_dir=Path(
                os.getenv(
                    "STATE_DIR",
                    str(Path.home() / ".local" / "share" / "sylora-companion"),
                )
            ).expanduser(),
            body_limit_bytes=_int_env("BODY_LIMIT_BYTES", 65536),
            rate_limit_per_minute=_int_env("RATE_LIMIT_PER_MINUTE", 120),
        )
