import re
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

_CONTROL = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


def _clean(v: str) -> str:
    return _CONTROL.sub("", v).strip()


DurationType = Literal["less_than_24h", "1_to_3_days", "4_to_14_days", "more_than_2_weeks", "unknown"]
AgeGroupType = Literal["infant", "child", "adult", "elderly", "unspecified"]


class GuidanceIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    query: str | None = Field(default=None, max_length=500, description="Health concern, symptom description, or question")
    primary_symptoms: list[str] = Field(default_factory=list, description="Selected symptoms from controlled clinical vocabulary")
    duration: DurationType = Field(default="unknown", description="Reported duration of symptoms")
    age_group: AgeGroupType = Field(default="unspecified", description="Patient age bracket")
    is_pregnant: bool = Field(default=False, description="Whether the patient is currently pregnant")
    location_hint: str | None = Field(default=None, max_length=100, description="Optional city/state for facility matching")
    language: str = Field(default="en", max_length=35, description="BCP-47 language code (e.g., 'en', 'hi')")
    allow_ai_synthesis: bool = Field(default=False, description="User consent for optional AI synthesis")

    @field_validator("query", mode="before")
    @classmethod
    def _sanitize_query(cls, v: str | None) -> str | None:
        if v is None:
            return None
        if not isinstance(v, str):
            raise ValueError("must be text")
        cleaned = _clean(v)
        if len(cleaned) < 2:
            raise ValueError("Please provide at least 2 characters describing your concern.")
        return cleaned

    @field_validator("primary_symptoms", mode="before")
    @classmethod
    def _sanitize_symptoms(cls, v) -> list[str]:
        if not isinstance(v, list):
            return []
        return [_clean(s).lower() for s in v if isinstance(s, str) and _clean(s)]

    @field_validator("location_hint", mode="before")
    @classmethod
    def _sanitize_location(cls, v: str | None) -> str | None:
        if not v or not isinstance(v, str):
            return None
        cleaned = _clean(v)
        return cleaned or None

    @field_validator("language", mode="before")
    @classmethod
    def _sanitize_lang(cls, v: str) -> str:
        if not isinstance(v, str):
            return "en"
        return _clean(v).lower()

    @model_validator(mode="after")
    def _validate_has_input(self):
        if not self.query and not self.primary_symptoms:
            raise ValueError("Please provide either a symptom query or select at least one symptom.")
        return self


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

    # CarePath Intelligence enhancements
    explainable_rationale: str
    contraindications: list[str] = Field(default_factory=list)
    doctor_summary: str
    intake_summary: dict = Field(default_factory=dict)
