import mimetypes
import uuid
from abc import ABC, abstractmethod
from pathlib import Path

import structlog

from platform_api.config import get_settings
from platform_api.core.exceptions import SyloraHTTPException
from fastapi import status

logger = structlog.get_logger()

ALLOWED_IMAGE = {"image/jpeg", "image/png", "image/webp", "image/gif"}
ALLOWED_VIDEO = {"video/mp4", "video/webm", "video/quicktime"}
MAX_IMAGE_BYTES = 10 * 1024 * 1024
MAX_VIDEO_BYTES = 500 * 1024 * 1024


class StorageBackend(ABC):
    @abstractmethod
    async def save(self, *, key: str, data: bytes, content_type: str) -> str:
        pass

    @abstractmethod
    async def read(self, key: str) -> bytes:
        pass

    @abstractmethod
    def public_url(self, key: str) -> str:
        pass


class LocalStorageBackend(StorageBackend):
    def __init__(self, base_path: str, public_base_url: str) -> None:
        self.base = Path(base_path)
        self.base.mkdir(parents=True, exist_ok=True)
        self.public_base_url = public_base_url.rstrip("/")

    async def save(self, *, key: str, data: bytes, content_type: str) -> str:
        path = self.base / key
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        return self.public_url(key)

    async def read(self, key: str) -> bytes:
        return (self.base / key).read_bytes()

    def public_url(self, key: str) -> str:
        return f"{self.public_base_url}/{key}"


class S3StorageBackend(StorageBackend):
    def __init__(self) -> None:
        settings = get_settings()
        if not settings.s3_configured:
            raise SyloraHTTPException(
                status.HTTP_503_SERVICE_UNAVAILABLE,
                "s3_not_configured",
                "S3 storage is not configured. Set S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY.",
            )
        try:
            import boto3
        except ImportError as exc:
            raise SyloraHTTPException(
                status.HTTP_503_SERVICE_UNAVAILABLE,
                "s3_dependency_missing",
                "boto3 is required for S3 storage. Install with: pip install boto3",
            ) from exc

        self.bucket = settings.s3_bucket
        self.client = boto3.client(
            "s3",
            endpoint_url=settings.s3_endpoint,
            aws_access_key_id=settings.s3_access_key,
            aws_secret_access_key=settings.s3_secret_key,
            region_name=settings.s3_region,
        )

    async def save(self, *, key: str, data: bytes, content_type: str) -> str:
        self.client.put_object(Bucket=self.bucket, Key=key, Body=data, ContentType=content_type)
        return self.public_url(key)

    async def read(self, key: str) -> bytes:
        obj = self.client.get_object(Bucket=self.bucket, Key=key)
        return obj["Body"].read()

    def public_url(self, key: str) -> str:
        settings = get_settings()
        if settings.s3_endpoint:
            return f"{settings.s3_endpoint.rstrip('/')}/{self.bucket}/{key}"
        return f"https://{self.bucket}.s3.amazonaws.com/{key}"


def get_storage() -> StorageBackend:
    settings = get_settings()
    if settings.media_storage == "s3":
        return S3StorageBackend()
    return LocalStorageBackend(settings.media_local_path, settings.media_public_base_url)


def validate_upload(content_type: str, size: int, *, is_video: bool = False) -> None:
    allowed = ALLOWED_VIDEO if is_video else ALLOWED_IMAGE
    max_size = MAX_VIDEO_BYTES if is_video else MAX_IMAGE_BYTES
    if content_type not in allowed:
        raise SyloraHTTPException(
            status.HTTP_400_BAD_REQUEST,
            "invalid_media_type",
            f"Unsupported file type: {content_type}",
        )
    if size > max_size:
        raise SyloraHTTPException(
            status.HTTP_400_BAD_REQUEST,
            "file_too_large",
            f"File exceeds maximum size of {max_size} bytes",
        )


def build_storage_key(owner_id: uuid.UUID, filename: str) -> str:
    ext = Path(filename).suffix.lower() or mimetypes.guess_extension("application/octet-stream") or ""
    return f"{owner_id}/{uuid.uuid4()}{ext}"
