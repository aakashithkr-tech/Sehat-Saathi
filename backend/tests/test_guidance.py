import logging
from unittest.mock import MagicMock, patch

import pytest

from app.database import get_db
from app.models import Resource
from app.seed import seed_verified_resources


@pytest.fixture()
def verified_seeded(Session):
    with Session() as db:
        seed_verified_resources(db)


def test_guidance_empty_or_invalid_query(client):
    # Empty query
    r = client.post("/api/v1/guidance", json={"query": ""})
    assert r.status_code == 422
    assert "query" in r.json().get("fields", {})

    # Too short
    r2 = client.post("/api/v1/guidance", json={"query": "x"})
    assert r2.status_code == 422

    # Too long (>500 chars)
    r3 = client.post("/api/v1/guidance", json={"query": "a" * 501})
    assert r3.status_code == 422

    # Extra forbidden fields
    r4 = client.post("/api/v1/guidance", json={"query": "fever", "extra": "forbidden"})
    assert r4.status_code == 422


def test_guidance_emergency_cardiac(client, verified_seeded):
    payload = {"query": "Severe chest pain radiating to left arm and pressure"}
    r = client.post("/api/v1/guidance", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert data["is_emergency"] is True
    assert data["urgency_level"] == "emergency"
    assert "CRITICAL EMERGENCY ALERT" in data["emergency_notice"]
    assert any("108" in act for act in data["suggested_actions"])
    # Ensure emergency care option (108) is present
    care_contacts = [c["contact"] for c in data["care_options"] if c.get("contact")]
    assert any("108" in c for c in care_contacts)
    assert "MEDICAL DISCLAIMER" in data["disclaimer"]


def test_guidance_emergency_stroke(client, verified_seeded):
    payload = {"query": "Sudden facial droop, arm weakness, and slurred speech"}
    r = client.post("/api/v1/guidance", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert data["is_emergency"] is True
    assert data["urgency_level"] == "emergency"
    assert "Stroke" in data["emergency_notice"]


def test_guidance_emergency_respiratory(client, verified_seeded):
    payload = {"query": "Patient cannot breathe and is gasping for air with blue lips"}
    r = client.post("/api/v1/guidance", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert data["is_emergency"] is True
    assert data["urgency_level"] == "emergency"


def test_guidance_relevant_topic_dehydration(client, verified_seeded):
    payload = {"query": "Child has loose motion and vomiting, very thirsty"}
    r = client.post("/api/v1/guidance", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert data["is_emergency"] is False
    assert data["has_matching_information"] is True
    assert data["urgency_level"] in ("self_care_education", "seek_consultation")
    # Verified topic returned
    topic_ids = [t["id"] for t in data["topics"]]
    assert "info-topic-dehydration-ors" in topic_ids
    # Actions include ORS
    assert any("ORS" in act or "Oral Rehydration" in act for act in data["suggested_actions"])
    # Topics have source and timestamp
    for t in data["topics"]:
        assert t["source"]
        assert t["last_verified_at"]
        assert t["is_sample"] is False
    assert data["contains_sample_data"] is False


def test_guidance_relevant_topic_dengue(client, verified_seeded):
    payload = {"query": "High fever, joint pain, mosquito fever, headache behind eyes"}
    r = client.post("/api/v1/guidance", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert data["has_matching_information"] is True
    topic_ids = [t["id"] for t in data["topics"]]
    assert "info-topic-dengue-warning" in topic_ids
    assert data["urgency_level"] == "seek_consultation"


def test_guidance_unmatched_out_of_scope(client, verified_seeded):
    payload = {"query": "Quantum mechanical wavefunctions in condensed matter physics"}
    r = client.post("/api/v1/guidance", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert data["is_emergency"] is False
    assert data["has_matching_information"] is False
    assert data["urgency_level"] == "unclear"
    assert "No reliable matching health information was found" in data["summary"]
    # Fallback to general helplines
    assert len(data["care_options"]) > 0


def test_guidance_sample_resource_warning(client, Session):
    # Seed only sample data
    with Session() as db:
        db.add(
            Resource(
                id="sample-info-fever",
                kind="information",
                title="Sample Fever Info",
                summary="Sample data for local development only.",
                category="Fever",
                language="en",
                source="Sample Source",
                is_sample=True,
                active=True,
            )
        )
        db.commit()

    r = client.post("/api/v1/guidance", json={"query": "fever and headache"})
    assert r.status_code == 200
    data = r.json()
    assert data["contains_sample_data"] is True
    sample_topics = [t for t in data["topics"] if t["is_sample"]]
    assert len(sample_topics) > 0


def test_guidance_control_characters_cleaned(client, verified_seeded):
    payload = {"query": "Diarrhea \x00\x08\x0b and dehydration \x0e\x1f care"}
    r = client.post("/api/v1/guidance", json=payload)
    assert r.status_code == 200
    assert r.json()["has_matching_information"] is True


def test_guidance_privacy_logs_do_not_contain_query(client, verified_seeded, caplog):
    sensitive_query = "confidential patient symptom query 987654321"
    with caplog.at_level(logging.INFO, logger="sehat.guidance"):
        r = client.post("/api/v1/guidance", json={"query": sensitive_query})
        assert r.status_code == 200
    # The sensitive string must NEVER be present in the logs
    for record in caplog.records:
        assert sensitive_query not in record.message


def test_guidance_database_error_handling(client):
    def broken_db():
        raise RuntimeError("database connection crashed")
        yield  # pragma: no cover

    client.app.dependency_overrides[get_db] = broken_db
    r = client.post("/api/v1/guidance", json={"query": "fever"})
    assert r.status_code == 500
    assert "database connection crashed" not in r.text
    assert r.json()["detail"].startswith("Something went wrong")


def test_guidance_ai_synthesis_opted_out_by_default(client, verified_seeded):
    payload = {"query": "What are symptoms of diabetes?"}
    r = client.post("/api/v1/guidance", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert data["ai_generated"] is False
    assert data["ai_status"] == "opted_out"


def test_guidance_ai_synthesis_not_configured_when_no_key(client, verified_seeded):
    payload = {"query": "What are symptoms of diabetes?", "allow_ai_synthesis": True}
    r = client.post("/api/v1/guidance", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert data["ai_generated"] is False
    assert data["ai_status"] == "not_configured"


def test_guidance_ai_synthesis_provider_failure_graceful_fallback(client, verified_seeded, settings):
    settings.ai_guidance_enabled = True
    settings.gemini_api_key = "test-fake-key"

    with patch("httpx.Client") as mock_client_cls:
        mock_instance = MagicMock()
        mock_client_cls.return_value.__enter__.return_value = mock_instance
        mock_instance.post.side_effect = Exception("network timeout to Gemini")

        payload = {"query": "What are symptoms of diabetes?", "allow_ai_synthesis": True}
        r = client.post("/api/v1/guidance", json=payload)
        assert r.status_code == 200
        data = r.json()
        assert data["ai_generated"] is False
        assert data["ai_status"] == "failed"
        # Deterministic summary is still safely returned
        assert len(data["summary"]) > 0


def test_guidance_ai_synthesis_provider_success(client, verified_seeded, settings):
    settings.ai_guidance_enabled = True
    settings.gemini_api_key = "test-fake-key"

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "candidates": [
            {
                "content": {
                    "parts": [
                        {"text": "AI synthesized educational summary: Diabetes causes frequent urination and thirst."}
                    ]
                }
            }
        ]
    }

    with patch("httpx.Client") as mock_client_cls:
        mock_instance = MagicMock()
        mock_client_cls.return_value.__enter__.return_value = mock_instance
        mock_instance.post.return_value = mock_resp

        payload = {"query": "What are symptoms of diabetes?", "allow_ai_synthesis": True}
        r = client.post("/api/v1/guidance", json=payload)
        assert r.status_code == 200
        data = r.json()
        assert data["ai_generated"] is True
        assert data["ai_status"] == "generated"
        assert "AI synthesized educational summary" in data["summary"]


def test_carepath_structured_intake_tuberculosis_rule(client, verified_seeded):
    payload = {
        "primary_symptoms": ["cough"],
        "duration": "more_than_2_weeks",
        "age_group": "adult",
        "is_pregnant": False,
    }
    r = client.post("/api/v1/guidance", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert data["urgency_level"] == "seek_consultation"
    assert "Tuberculosis" in data["explainable_rationale"] or "sputum" in data["explainable_rationale"]
    # Check TB topic and actions
    topic_ids = [t["id"] for t in data["topics"]]
    assert "info-topic-tuberculosis-awareness" in topic_ids
    assert any("sputum" in act.lower() for act in data["suggested_actions"])
    # Check doctor summary handover card
    assert "CAREPATH CLINICAL SUMMARY" in data["doctor_summary"]
    assert "More than 2 weeks" in data["doctor_summary"] or "more than 2 weeks" in data["doctor_summary"].lower()


def test_carepath_pediatric_dehydration_and_contraindication(client, verified_seeded):
    payload = {
        "primary_symptoms": ["loose_motion_diarrhea", "vomiting"],
        "duration": "1_to_3_days",
        "age_group": "child",
    }
    r = client.post("/api/v1/guidance", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert data["urgency_level"] in ("seek_consultation", "self_care_education")
    assert "pediatric" in data["explainable_rationale"].lower() or "infant" in data["explainable_rationale"].lower()
    # Contraindication against anti-motility drugs for children
    assert any("motility" in c.lower() or "loperamide" in c.lower() for c in data["contraindications"])
    # Doctor handover contains child age and contraindications
    assert "Child" in data["doctor_summary"]
    assert "CONTRAINDICATIONS" in data["doctor_summary"]


def test_carepath_dengue_nsaid_contraindication(client, verified_seeded):
    payload = {
        "primary_symptoms": ["fever", "body_aches_joint_pain", "headache"],
        "duration": "1_to_3_days",
        "age_group": "adult",
    }
    r = client.post("/api/v1/guidance", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert data["urgency_level"] == "seek_consultation"
    # Specific contraindication warning against Aspirin/NSAIDs
    assert any("aspirin" in c.lower() or "nsaid" in c.lower() for c in data["contraindications"])


def test_carepath_maternal_pregnancy_alert(client, verified_seeded):
    payload = {
        "primary_symptoms": ["vomiting"],
        "duration": "1_to_3_days",
        "age_group": "adult",
        "is_pregnant": True,
    }
    r = client.post("/api/v1/guidance", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert "pregnancy" in data["explainable_rationale"].lower() or "maternal" in data["explainable_rationale"].lower()
    # Check maternal helpline or hospital referral
    care_ids = [c["id"] for c in data["care_options"]]
    assert any("102" in cid or "maternal" in cid or "helpline" in cid for cid in care_ids)


def test_carepath_location_hint_boosts_local_facility(client, verified_seeded):
    payload = {
        "query": "Need emergency casualty care",
        "location_hint": "New Delhi",
    }
    r = client.post("/api/v1/guidance", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert len(data["care_options"]) > 0
    # AIIMS or Safdarjung (Delhi tertiary facilities) present
    delhi_care = [c for c in data["care_options"] if "delhi" in (c.get("location") or "").lower()]
    assert len(delhi_care) > 0

