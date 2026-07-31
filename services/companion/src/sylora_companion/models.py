"""Strict API and cloud command schemas."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator
from pydantic.alias_generators import to_camel


class StrictModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        extra="forbid",
        strict=True,
        validate_by_alias=True,
        validate_by_name=False,
    )


class SceneName(StrictModel):
    scene_name: str = Field(min_length=1, max_length=512)


class SceneItemMutation(SceneName):
    scene_item_id: int = Field(ge=0)
    enabled: bool


class InputName(StrictModel):
    input_name: str = Field(min_length=1, max_length=512)


class EnabledMutation(StrictModel):
    enabled: bool


class MuteMutation(StrictModel):
    muted: bool


class InputMuteMutation(InputName):
    muted: bool


class VolumeMutation(StrictModel):
    multiplier: float | None = Field(default=None, ge=0, le=20)
    decibels: float | None = Field(default=None, ge=-100, le=26)

    @model_validator(mode="after")
    def exactly_one_volume(self) -> VolumeMutation:
        if (self.multiplier is None) == (self.decibels is None):
            raise ValueError("exactly one of multiplier or decibels is required")
        return self


class InputVolumeMutation(VolumeMutation):
    input_name: str = Field(min_length=1, max_length=512)


class ScreenshotRequest(StrictModel):
    source_name: str = Field(min_length=1, max_length=512)
    image_format: Literal["png", "jpg", "jpeg", "bmp"]
    width: int | None = Field(default=None, ge=1, le=16_384)
    height: int | None = Field(default=None, ge=1, le=16_384)
    quality: int | None = Field(default=None, ge=-1, le=100)


class SaveScreenshotRequest(ScreenshotRequest):
    file_path: str = Field(min_length=1, max_length=4096)


class ConfirmationDecision(StrictModel):
    approved: bool


class CloudCommand(StrictModel):
    type: Literal["command"]
    command_id: str = Field(alias="commandId", min_length=1, max_length=128)
    action: str = Field(min_length=1, max_length=128)
    arguments: dict[str, Any] = Field(default_factory=dict)
    timestamp: int
    nonce: str = Field(min_length=16, max_length=256)
    signature: str = Field(min_length=64, max_length=128)


class PairingResponse(StrictModel):
    device_id: str = Field(min_length=1, max_length=256)
    credential: str = Field(min_length=32, max_length=4096)


class UpdateManifest(StrictModel):
    version: str = Field(min_length=1, max_length=128)
    platform: str = Field(min_length=1, max_length=128)
    url: str = Field(min_length=1, max_length=4096)
    sha256: str = Field(pattern=r"^[0-9a-fA-F]{64}$")
    signature: str = Field(min_length=40, max_length=256)
