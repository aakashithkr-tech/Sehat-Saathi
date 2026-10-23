from sqlalchemy import select

from app.models import ContactMessage


def test_valid_submission_is_stored(client, Session, valid_payload):
    r = client.post("/api/v1/contact", json=valid_payload)
    assert r.status_code == 201
    body = r.json()
    assert body["status"] == "received"
    assert body["email_notification"] == "not_configured"
    assert "not configured" in body["detail"]
    assert "sent" not in body["detail"].lower().replace("not sent", "")
    with Session() as db:
        row = db.scalar(select(ContactMessage).where(ContactMessage.id == body["id"]))
        assert row is not None
        assert (row.name, row.email, row.topic) == ("Asha", "asha@example.com", "General question")
        assert row.message == valid_payload["message"]


def test_ids_are_unique(client, valid_payload):
    a = client.post("/api/v1/contact", json=valid_payload).json()["id"]
    b = client.post("/api/v1/contact", json={**valid_payload, "message": "A different long message here."}).json()["id"]
    assert a != b


def test_input_is_trimmed(client, Session, valid_payload):
    valid_payload.update(name="  Asha  ", message="   I need help finding a clinic.   ")
    body = client.post("/api/v1/contact", json=valid_payload).json()
    with Session() as db:
        row = db.get(ContactMessage, body["id"])
        assert row.name == "Asha" and row.message == "I need help finding a clinic."


def test_subject_alias_accepted(client, Session, valid_payload):
    del valid_payload["topic"]
    valid_payload["subject"] = "From subject"
    body = client.post("/api/v1/contact", json=valid_payload).json()
    with Session() as db:
        assert db.get(ContactMessage, body["id"]).topic == "From subject"


import pytest


@pytest.mark.parametrize(
    "change,field",
    [
        ({"name": "   "}, "name"),
        ({"name": ""}, "name"),
        ({"name": "x" * 121}, "name"),
        ({"email": "not-an-email"}, "email"),
        ({"email": ""}, "email"),
        ({"topic": ""}, "topic"),
        ({"message": "short"}, "message"),
        ({"message": "   " + "a" * 5 + "   "}, "message"),
        ({"message": "x" * 5001}, "message"),
        ({"name": "Line\nbreak"}, "name"),
    ],
)
def test_invalid_input_rejected_and_not_stored(client, Session, valid_payload, change, field):
    r = client.post("/api/v1/contact", json={**valid_payload, **change})
    assert r.status_code == 422
    assert field in r.json()["fields"]
    with Session() as db:
        assert db.scalar(select(ContactMessage.id)) is None


def test_missing_and_unknown_fields_rejected(client, valid_payload):
    assert client.post("/api/v1/contact", json={}).status_code == 422
    assert client.post("/api/v1/contact", json={**valid_payload, "admin": True}).status_code == 422
    assert client.post("/api/v1/contact", content="not json", headers={"Content-Type": "application/json"}).status_code == 422


def test_duplicate_submission_not_stored_twice(client, Session, valid_payload):
    first = client.post("/api/v1/contact", json=valid_payload)
    second = client.post("/api/v1/contact", json=valid_payload)
    assert first.status_code == 201 and second.status_code == 200
    assert second.json()["duplicate"] is True
    assert second.json()["id"] == first.json()["id"]
    with Session() as db:
        assert len(db.scalars(select(ContactMessage)).all()) == 1


def test_rate_limit(client, valid_payload):
    for i in range(3):
        assert client.post("/api/v1/contact", json={**valid_payload, "message": f"Message number {i} for rate test"}).status_code == 201
    r = client.post("/api/v1/contact", json={**valid_payload, "message": "One message too many for the limit"})
    assert r.status_code == 429
    assert int(r.headers["retry-after"]) >= 1


def test_messages_are_not_publicly_readable(client, valid_payload):
    mid = client.post("/api/v1/contact", json=valid_payload).json()["id"]
    for path in ("/api/v1/contact", f"/api/v1/contact/{mid}"):
        assert client.get(path).status_code in (404, 405)
    paths = client.get("/openapi.json").json()["paths"]
    assert set(paths["/api/v1/contact"]) == {"post"}


def test_sql_injection_text_is_stored_literally(client, Session, valid_payload):
    valid_payload["message"] = "Robert'); DROP TABLE contact_messages;-- please help"
    body = client.post("/api/v1/contact", json=valid_payload).json()
    with Session() as db:
        assert db.get(ContactMessage, body["id"]).message.startswith("Robert');")
        assert db.scalar(select(ContactMessage.id)) is not None


class _FakeSMTP:
    sent: list = []
    fail = False

    def __init__(self, *a, **k):
        if _FakeSMTP.fail:
            raise OSError("boom")

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False

    def starttls(self):
        pass

    def login(self, *a):
        pass

    def send_message(self, msg):
        _FakeSMTP.sent.append(msg)


def _with_smtp(client, monkeypatch, settings, fail):
    from app.config import get_settings
    from app.config import Settings

    _FakeSMTP.sent, _FakeSMTP.fail = [], fail
    monkeypatch.setattr("app.services.email_service.smtplib.SMTP", _FakeSMTP)
    s = Settings(_env_file=None, smtp_host="smtp.test", smtp_from="a@test.dev", contact_notify_to="b@test.dev", cors_origins=settings.cors_origins)
    client.app.dependency_overrides[get_settings] = lambda: s


def test_email_reported_sent_only_when_smtp_accepts(client, monkeypatch, settings, valid_payload, Session):
    _with_smtp(client, monkeypatch, settings, fail=False)
    body = client.post("/api/v1/contact", json=valid_payload).json()
    assert body["email_notification"] == "sent" and len(_FakeSMTP.sent) == 1
    assert _FakeSMTP.sent[0]["Reply-To"] == "asha@example.com"


def test_smtp_failure_still_stores_and_does_not_claim_sent(client, monkeypatch, settings, valid_payload, Session):
    _with_smtp(client, monkeypatch, settings, fail=True)
    r = client.post("/api/v1/contact", json=valid_payload)
    assert r.status_code == 201 and r.json()["email_notification"] == "failed"
    with Session() as db:
        assert db.get(ContactMessage, r.json()["id"]).email_status == "failed"
