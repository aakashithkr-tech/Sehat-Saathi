import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from app.config import Settings, get_settings
from app.database import Base, get_db, make_engine
from app.main import create_app
from app.services.rate_limit import contact_limiter


@pytest.fixture()
def engine(tmp_path):
    from app import models  # noqa: F401

    eng = make_engine(f"sqlite:///{tmp_path / 'test.db'}")
    Base.metadata.create_all(eng)
    yield eng
    eng.dispose()


@pytest.fixture()
def Session(engine):
    return sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


@pytest.fixture()
def settings():
    return Settings(
        _env_file=None,
        cors_origins="http://localhost:5173",
        contact_rate_limit=3,
        contact_rate_window_seconds=600,
    )


@pytest.fixture()
def client(Session, settings):
    contact_limiter.reset()
    app = create_app()

    def _db():
        db = Session()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = _db
    app.dependency_overrides[get_settings] = lambda: settings
    # No `with`: lifespan (real DB + seeding) is intentionally not run.
    return TestClient(app, raise_server_exceptions=False)


VALID = {"name": "Asha", "email": "asha@example.com", "topic": "General question", "message": "I need help finding a clinic."}


@pytest.fixture()
def valid_payload():
    return dict(VALID)


@pytest.fixture()
def seeded(Session):
    from app.models import Resource

    with Session() as db:
        db.add_all(
            [
                Resource(id="r1", kind="information", title="Handwashing basics", summary="How to wash hands", category="Hygiene", language="en", source="test"),
                Resource(id="r2", kind="information", title="Safe water", summary="Keeping water clean", category="Hygiene", language="hi", source="test"),
                Resource(id="r3", kind="care", title="Test clinic", summary="A test care entry", category="Clinic", language="en", location="Testville", source="test", url="https://example.org/x", contact="108"),
                Resource(id="r4", kind="care", title="Hidden entry", summary="inactive", category="Clinic", language="en", source="test", active=False),
                Resource(id="r5", kind="care", title="Bad link", summary="unsafe url", category="Clinic", language="en", source="test", url="javascript:alert(1)"),
            ]
        )
        db.commit()
