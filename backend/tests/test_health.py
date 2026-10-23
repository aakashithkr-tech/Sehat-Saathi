import os

from fastapi.testclient import TestClient

from app.config import get_settings
from app.main import create_app


def test_health_ok(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok", "database": "ok"}


def test_docs_enabled_in_development(client):
    assert client.get("/docs").status_code == 200


def test_docs_disabled_in_production(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    get_settings.cache_clear()
    try:
        prod = TestClient(create_app())
        assert prod.get("/docs").status_code == 404
        assert prod.get("/openapi.json").status_code == 404
    finally:
        monkeypatch.delenv("APP_ENV")
        get_settings.cache_clear()
