from datetime import datetime
from typing import Literal
from urllib.parse import urlparse

from pydantic import BaseModel, ConfigDict, field_validator


class ResourceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    kind: Literal["information", "care"]
    title: str
    summary: str
    category: str
    provider: str | None = None
    url: str | None = None
    contact: str | None = None
    language: str
    location: str | None = None
    source: str
    is_sample: bool
    last_verified_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    @field_validator("url")
    @classmethod
    def _http_only(cls, v: str | None) -> str | None:
        # Never hand the browser javascript:, data:, etc.
        if not v:
            return None
        p = urlparse(v)
        return v if p.scheme in ("http", "https") and p.netloc else None


class ResourceList(BaseModel):
    items: list[ResourceOut]
    total: int
    page: int
    page_size: int
    pages: int


class CategoryOut(BaseModel):
    name: str
    count: int
