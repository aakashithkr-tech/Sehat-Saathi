import logging
import smtplib
from email.message import EmailMessage

from ..config import Settings

log = logging.getLogger("sehat.email")


def send_contact_notification(settings: Settings, *, message_id: str, name: str, email: str, topic: str, body: str) -> str:
    """Returns "sent", "not_configured" or "failed". "sent" only when the SMTP server accepted the message."""
    if not settings.email_configured:
        return "not_configured"
    msg = EmailMessage()
    # Header values are single-line (validated upstream); strip CR/LF defensively against header injection.
    clean = lambda s: s.replace("\r", " ").replace("\n", " ")  # noqa: E731
    msg["Subject"] = f"[Sehat Saathi] {clean(topic)}"[:200]
    msg["From"] = settings.smtp_from
    msg["To"] = settings.contact_notify_to
    msg["Reply-To"] = email
    msg.set_content(f"From: {clean(name)} <{email}>\nTopic: {clean(topic)}\nReference: {message_id}\n\n{body}")
    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as smtp:
            if settings.smtp_use_tls:
                smtp.starttls()
            if settings.smtp_username:
                smtp.login(settings.smtp_username, settings.smtp_password)
            smtp.send_message(msg)
        return "sent"
    except Exception as exc:  # noqa: BLE001
        log.error("email notification failed for %s: %s", message_id, type(exc).__name__)
        return "failed"
