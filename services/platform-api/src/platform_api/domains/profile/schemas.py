from pydantic import BaseModel, Field


class ProfileUpdateRequest(BaseModel):
    display_name: str | None = Field(default=None, min_length=1, max_length=80)
    bio: str | None = Field(default=None, max_length=500)
    avatar_url: str | None = Field(default=None, max_length=2048)
    locale: str | None = Field(default=None, pattern=r"^[a-z]{2}$")


class ProfilePublic(BaseModel):
    handle: str
    display_name: str
    bio: str | None
    avatar_url: str | None
    locale: str

    model_config = {"from_attributes": True}
