import re
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

_CONTROL = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


def _clean(v: str) -> str:
    return _CONTROL.sub("", v).strip()


class GuidanceIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    query: str = Field(min_length=2, max_length=500, description="Health concern, symptom, or question")
    language: str = Field(default="en", max_length=35, description="BCP-47 language code (e.g., 'en', 'hi')")
    allow_ai_synthesis: bool = Field(default=False, description="User consent for optional AI synthesis")

    @field_validator("query", mode="before")
    @classmethod
    def _sanitize_query(cls, v: str) -> str:
        if not isinstance(v, str):
            raise ValueError("must be text")
        cleaned = _clean(v)
        if len(cleaned) < 2:
            raise ValueError("Please provide at least 2 characters describing your concern.")
        return cleaned

    @field_validator("language", mode="before")
    @classmethod
    def _sanitize_lang(cls, v: str) -> str:
        if not isinstance(v, str):
            return "en"
        return _clean(v).lower()


class GuidanceTopic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    summary: str
    category: str
    source: str
    url: str | None = None
    last_verified_at: datetime | None = None
    is_sample: bool = False


class GuidanceCare(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    summary: str
    category: str
    contact: str | None = None
    location: str | None = None
    url: str | None = None
    source: str
    is_sample: bool = False


class GuidanceOut(BaseModel):
    is_emergency: bool
    urgency_level: Literal["emergency", "seek_consultation", "self_care_education", "unclear"]
    emergency_notice: str | None = None
    has_matching_information: bool
    summary: str
    suggested_actions: list[str]
    topics: list[GuidanceTopic]
    care_options: list[GuidanceCare]
    disclaimer: str
    ai_generated: bool
    ai_status: Literal["opted_out", "not_configured", "generated", "failed"]
    contains_sample_data: bool = False
    created_at: datetime
