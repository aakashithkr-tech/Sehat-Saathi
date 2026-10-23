import re
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

_CONTROL = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


def _clean(v: str) -> str:
    return _CONTROL.sub("", v).strip()


class ContactIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=120)
    email: EmailStr = Field(max_length=254)
    # The existing UI sends "topic" (a dropdown). "subject" is accepted as an alias.
    topic: str = Field(min_length=1, max_length=120)
    message: str = Field(min_length=10, max_length=5000)

    @model_validator(mode="before")
    @classmethod
    def _subject_alias(cls, data):
        if isinstance(data, dict) and "topic" not in data and "subject" in data:
            data = {**data, "topic": data["subject"]}
            data.pop("subject", None)
        return data

    @field_validator("name", "topic", "message", mode="before")
    @classmethod
    def _trim(cls, v):
        if not isinstance(v, str):
            raise ValueError("must be text")
        return _clean(v)

    @field_validator("name")
    @classmethod
    def _no_newlines_in_name(cls, v: str) -> str:
        if "\n" in v or "\r" in v:
            raise ValueError("must be a single line")
        return v


class ContactOut(BaseModel):
    id: str
    status: Literal["received"] = "received"
    duplicate: bool = False
    # "sent" only if an SMTP server actually accepted the notification.
    email_notification: Literal["sent", "not_configured", "failed"]
    detail: str
