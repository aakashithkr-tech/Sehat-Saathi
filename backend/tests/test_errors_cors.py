from fastapi.testclient import TestClient

from app.database import get_db


def test_unexpected_error_hides_internals(client):
    def boom():
        raise RuntimeError("secret-db-password-xyz")
        yield  # pragma: no cover

    client.app.dependency_overrides[get_db] = boom
    r = client.get("/api/v1/resources")
    assert r.status_code == 500
    assert "secret" not in r.text and "Traceback" not in r.text
    assert r.json()["detail"].startswith("Something went wrong")


def test_unknown_route_404(client):
    assert client.get("/api/v1/nothing").status_code == 404


def test_cors_allows_configured_origin(client):
    r = client.options(
        "/api/v1/contact",
        headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type"},
    )
    assert r.status_code == 200
    assert r.headers["access-control-allow-origin"] == "http://localhost:5173"


def test_cors_blocks_other_origin(client):
    r = client.options(
        "/api/v1/contact",
        headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "POST"},
    )
    assert "access-control-allow-origin" not in r.headers
    r2 = client.get("/health", headers={"Origin": "https://evil.example"})
    assert "access-control-allow-origin" not in r2.headers


def test_wildcard_origin_is_ignored():
    from app.config import Settings

    assert Settings(_env_file=None, cors_origins="*").cors_origin_list == []
