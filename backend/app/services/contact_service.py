import hashlib
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import Settings
from ..models import ContactMessage
from ..schemas.contact import ContactIn, ContactOut
from .email_service import send_contact_notification

log = logging.getLogger("sehat.contact")

DETAIL = {
    "sent": "Your message was received and our team was notified by email.",
    "not_configured": "Your message was received and saved. Email notification is not configured on this server, so it will be read when someone reviews stored messages.",
    "failed": "Your message was received and saved, but the email notification could not be sent.",
}


def _hash(*parts: str) -> str:
    return hashlib.sha256("\x1f".join(parts).encode()).hexdigest()


def hash_client(settings: Settings, client_id: str) -> str:
    return _hash(settings.client_hash_salt, client_id)


def submit(db: Session, settings: Settings, data: ContactIn, client_id: str) -> ContactOut:
    content_hash = _hash(data.email.lower(), data.topic, data.message)
    since = datetime.now(timezone.utc) - timedelta(seconds=settings.contact_duplicate_window_seconds)
    existing = db.scalar(
        select(ContactMessage)
        .where(ContactMessage.content_hash == content_hash, ContactMessage.created_at >= since)
        .order_by(ContactMessage.created_at.desc())
    )
    if existing is not None:
        return ContactOut(
            id=existing.id,
            duplicate=True,
            email_notification=existing.email_status,  # type: ignore[arg-type]
            detail="This exact message was already received a moment ago, so it was not saved twice.",
        )

    row = ContactMessage(
        name=data.name,
        email=str(data.email),
        topic=data.topic,
        message=data.message,
        content_hash=content_hash,
        client_hash=hash_client(settings, client_id),
    )
    db.add(row)
    db.commit()

    status = send_contact_notification(
        settings, message_id=row.id, name=row.name, email=row.email, topic=row.topic, body=row.message
    )
    row.email_status = status
    db.commit()

    # Log the reference and email domain only, never message content.
    log.info("contact stored id=%s email_domain=%s email_status=%s", row.id, row.email.split("@")[-1], status)
    return ContactOut(id=row.id, email_notification=status, detail=DETAIL[status])  # type: ignore[arg-type]

