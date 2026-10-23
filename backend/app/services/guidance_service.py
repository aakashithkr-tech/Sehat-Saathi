import logging
import re
from datetime import datetime, timezone
from typing import Literal

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from ..config import Settings
from ..models import Resource
from ..schemas.guidance import GuidanceCare, GuidanceIn, GuidanceOut, GuidanceTopic

log = logging.getLogger("sehat.guidance")

DISCLAIMER = (
    "MEDICAL DISCLAIMER: Sehat Saathi provides verified educational health guidance only and is NOT a "
    "substitute for professional medical advice, clinical diagnosis, or personalized treatment. "
    "Health conditions require evaluation by a registered healthcare professional. If you or someone "
    "near you is experiencing severe symptoms or an acute medical crisis, call 108 or 112 immediately."
)

EMERGENCY_RULES: list[tuple[str, list[str]]] = [
    (
        "Severe Cardiac / Chest Crisis",
        [
            "chest pain", "chest pressure", "crushing chest", "heart attack",
            "radiating to left arm", "radiating to jaw", "chest tightness and breathlessness",
            "severe angina", "crushing pain",
        ],
    ),
    (
        "Acute Respiratory Distress",
        [
            "cannot breathe", "severe shortness of breath", "gasping for air",
            "blue lips", "blue face", "stridor", "choking", "asphyxiation",
            "unable to talk in full sentences", "severe breathlessness",
        ],
    ),
    (
        "Acute Neurological Event / Suspected Stroke",
        [
            "facial droop", "slurred speech", "sudden paralysis", "arm weakness",
            "sudden loss of vision", "unconscious", "unresponsive", "active seizure",
            "convulsions", "severe head injury", "fainting with head trauma",
        ],
    ),
    (
        "Uncontrolled Hemorrhage or Severe Trauma",
        [
            "coughing blood", "vomiting blood", "uncontrolled bleeding", "massive bleeding",
            "deep stab", "penetrating injury", "heavy arterial blood",
        ],
    ),
    (
        "Severe Anaphylaxis or Airway Obstruction",
        [
            "throat swelling", "swelling of tongue and throat", "anaphylaxis",
            "difficulty swallowing and breathing after sting",
        ],
    ),
    (
        "Acute Poisoning / Toxicity",
        [
            "swallowed poison", "snake bite", "pesticide ingestion", "chemical inhalation",
            "insecticide poisoning",
        ],
    ),
]

TOPIC_KEYWORDS: dict[str, list[str]] = {
    "info-topic-dehydration-ors": [
        "diarrhea", "diarrhoea", "loose motion", "vomiting", "dehydration", "ors",
        "oral rehydration", "dry mouth", "sunken eyes", "watery stool", "stomach bug",
    ],
    "info-topic-dengue-warning": [
        "dengue", "mosquito", "platelet", "retro-orbital", "eye pain", "breakbone",
        "high fever body pain", "rash fever", "chills fever",
    ],
    "info-topic-maternal-antenatal": [
        "pregnancy", "pregnant", "antenatal", "maternal", "trimester", "fetal",
        "morning sickness", "labor", "delivery", "baby movement",
    ],
    "info-topic-diabetes-lifestyle": [
        "diabetes", "blood sugar", "glucose", "frequent urination", "excessive thirst",
        "hba1c", "insulin", "slow healing", "sugar level",
    ],
    "info-topic-hypertension-care": [
        "hypertension", "high blood pressure", "bp", "systolic", "diastolic",
        "sodium", "salt", "blood pressure reading",
    ],
    "info-topic-anemia-nutrition": [
        "anemia", "anaemia", "hemoglobin", "low iron", "pale", "fatigue",
        "weakness", "ifa", "iron deficiency", "tiredness in women",
    ],
    "info-topic-heatstroke-firstaid": [
        "heat stroke", "heatstroke", "heat exhaustion", "sun stroke", "hot weather",
        "extreme heat", "dizzy in sun", "heat cramps",
    ],
    "info-topic-tuberculosis-awareness": [
        "tuberculosis", "tb", "coughing for 2 weeks", "cough 2 weeks", "coughing blood",
        "night sweats", "sputum", "nikshay", "weight loss cough",
    ],
}

TOPIC_ACTIONS: dict[str, list[str]] = {
    "info-topic-dehydration-ors": [
        "Prepare WHO-formula Oral Rehydration Salts (ORS) in clean drinking water and sip continuously after every loose stool.",
        "Continue light nutrition (rice kanji, thin dal, banana, curd) to prevent nutritional depletion.",
        "Never administer anti-diarrheal medicines to children without pediatric evaluation.",
        "Seek medical care at a Primary Health Centre if unable to keep fluids down, stool contains blood, or fever is high.",
    ],
    "info-topic-dengue-warning": [
        "Ensure round-the-clock oral fluid hydration (water, coconut water, fresh lime water).",
        "Monitor temperature regularly and use damp-sponge cooling if fever is high.",
        "Do NOT take aspirin, ibuprofen, or other NSAIDs as they increase bleeding risks in dengue.",
        "Watch for critical warning signs: persistent vomiting, abdominal pain, mucosal bleeding, or unusual sleepiness.",
    ],
    "info-topic-maternal-antenatal": [
        "Ensure at least 4 comprehensive antenatal checkups throughout pregnancy at your local healthcare centre.",
        "Take daily Iron and Folic Acid (IFA) supplements as prescribed by your auxiliary nurse midwife or doctor.",
        "Recognize red flags requiring immediate hospital evaluation: vaginal bleeding, severe headache with visual changes, sudden facial swelling, or diminished fetal movement.",
    ],
    "info-topic-diabetes-lifestyle": [
        "Get fasting blood glucose and HbA1c measured at an accredited clinic or government health centre.",
        "Incorporate daily moderate exercise (e.g. 30 minutes brisk walking) and increase dietary fiber.",
        "Inspect feet daily for cuts or blisters, and avoid walking barefoot.",
        "Consult a physician for tailored medication management; never alter insulin without medical supervision.",
    ],
    "info-topic-hypertension-care": [
        "Have blood pressure checked by a health worker using an appropriately sized arm cuff.",
        "Reduce dietary sodium intake (limit pickles, processed snacks, and table salt).",
        "Engage in regular aerobic physical activity and avoid all tobacco and alcohol consumption.",
        "If blood pressure exceeds 180/120 mmHg or is accompanied by chest pain or vision blur, seek immediate emergency care.",
    ],
    "info-topic-anemia-nutrition": [
        "Include natural iron-rich foods in daily meals: green leafy vegetables, lentils, chickpeas, and jaggery.",
        "Consume vitamin C sources (lemon, amla, oranges) alongside meals to maximize plant-based iron absorption.",
        "Have a complete blood count (CBC) to determine hemoglobin levels and confirm the specific type of anemia.",
        "Take government-provided Iron and Folic Acid (IFA) supplements under the Anemia Mukt Bharat program.",
    ],
    "info-topic-heatstroke-firstaid": [
        "Move the individual immediately to a shaded, well-ventilated, or air-conditioned area.",
        "Loosen tight clothing and apply cool, damp cloths or ice packs to the neck, armpits, and groin.",
        "If conscious and alert, provide sips of cool water or electrolyte-balanced fluids.",
        "If the person is confused, vomiting, or loses consciousness, call 108 immediately for emergency resuscitation.",
    ],
    "info-topic-tuberculosis-awareness": [
        "If a cough persists for more than two continuous weeks, visit a government health centre for a free sputum test.",
        "Cover mouth and nose when coughing and maintain good room ventilation.",
        "Remember that comprehensive TB diagnosis and medications are provided completely free under the National TB Elimination Programme.",
        "Never discontinue anti-TB medicines midway, even if feeling better, to avoid developing drug-resistant TB.",
    ],
}


def _check_emergency(query_lower: str) -> tuple[bool, str | None]:
    for category_name, patterns in EMERGENCY_RULES:
        for p in patterns:
            if p in query_lower:
                notice = (
                    f"CRITICAL EMERGENCY ALERT ({category_name}): Symptoms may indicate a life-threatening medical emergency. "
                    "Please call national ambulance service 108 or emergency 112 immediately, or go directly to the nearest hospital casualty department."
                )
                return True, notice
    return False, None


def _tokenize(text: str) -> set[str]:
    words = re.findall(r"[a-z0-9]+", text.lower())
    stop_words = {
        "i", "have", "am", "is", "are", "a", "an", "the", "and", "or", "to", "for",
        "of", "in", "on", "my", "me", "with", "from", "at", "by", "what", "how",
        "should", "can", "do", "does", "feel", "feeling", "get", "got", "very",
    }
    return {w for w in words if len(w) > 2 and w not in stop_words}


def _score_resource(tokens: set[str], r: Resource) -> int:
    score = 0
    text_fields = f"{r.title} {r.category} {r.summary}".lower()
    for tok in tokens:
        if tok in r.title.lower():
            score += 5
        elif tok in r.category.lower():
            score += 3
        elif tok in text_fields:
            score += 1
    return score


def _try_ai_synthesis(settings: Settings, query: str, topics: list[GuidanceTopic]) -> tuple[str | None, str]:
    """Optional synthesis using Google Gemini API strictly grounded in verified database topics."""
    if not settings.ai_configured:
        return None, "not_configured"

    try:
        import httpx  # type: ignore

        context_texts = [f"Topic: {t.title}\nCategory: {t.category}\nVerified Summary: {t.summary}" for t in topics]
        joined_context = "\n\n".join(context_texts)

        prompt = (
            "You are the health education summarizer for Sehat Saathi, a public health access companion.\n"
            "Synthesize an educational guidance summary for the user's question, strictly conditioned on the verified context below.\n"
            "RULES:\n"
            "1. Do NOT make definitive medical diagnoses.\n"
            "2. Do NOT prescribe pharmaceutical drugs or dosages.\n"
            "3. Emphasize when to see a qualified doctor.\n"
            "4. Keep the summary under 120 words, compassionate, and clear.\n\n"
            f"User Question: {query}\n\n"
            f"Verified Medical Context:\n{joined_context}\n\n"
            "Educational Summary:"
        )

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.gemini_model}:generateContent?key={settings.gemini_api_key}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.2, "maxOutputTokens": 250},
        }

        with httpx.Client(timeout=5.0) as client:
            resp = client.post(url, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                text = (
                    data.get("candidates", [{}])[0]
                    .get("content", {})
                    .get("parts", [{}])[0]
                    .get("text", "")
                    .strip()
                )
                if text:
                    return text, "generated"
            log.warning("AI synthesis non-200 status=%d response=%s", resp.status_code, resp.text[:200])
            return None, "failed"
    except Exception as exc:  # noqa: BLE001
        log.warning("AI synthesis provider failed: %s", type(exc).__name__)
        return None, "failed"


def process_guidance(db: Session, settings: Settings, payload: GuidanceIn) -> GuidanceOut:
    raw_query = payload.query
    query_lower = raw_query.lower()

    # 1. Emergency Safety Screening (Deterministic Rule Engine)
    is_emergency, emergency_notice = _check_emergency(query_lower)

    # 2. Keyword & Token Search in Curated Database
    tokens = _tokenize(raw_query)

    # Pre-select matching topic IDs from predefined mappings
    matched_predefined_ids: set[str] = set()
    for topic_id, keywords in TOPIC_KEYWORDS.items():
        if any(kw in query_lower for kw in keywords):
            matched_predefined_ids.add(topic_id)

    # Fetch active resources from DB
    conds = [Resource.active.is_(True)]
    if payload.language and payload.language != "en":
        # Include specific language or fallback to English
        conds.append(or_(Resource.language == payload.language, Resource.language == "en"))

    all_resources = db.scalars(select(Resource).where(*conds)).all()

    # Score and rank
    scored_info: list[tuple[int, Resource]] = []
    scored_care: list[tuple[int, Resource]] = []

    for r in all_resources:
        base_score = 10 if r.id in matched_predefined_ids else 0
        token_score = _score_resource(tokens, r)
        total_score = base_score + token_score
        if total_score > 0:
            if r.kind == "information":
                scored_info.append((total_score, r))
            else:
                scored_care.append((total_score, r))

    scored_info.sort(key=lambda x: x[0], reverse=True)
    scored_care.sort(key=lambda x: x[0], reverse=True)

    matched_info = [r for _, r in scored_info[:4]]
    matched_care = [r for _, r in scored_care[:4]]

    # If emergency, ensure emergency ambulance (108) and emergency tertiary hospital are prioritized
    if is_emergency:
        emergency_care = db.scalars(
            select(Resource).where(
                Resource.active.is_(True),
                Resource.kind == "care",
                or_(
                    Resource.category.ilike("%emergency%"),
                    Resource.contact.ilike("%108%"),
                    Resource.id.in_(["care-helpline-108", "care-facility-aiims-delhi", "care-facility-safdarjung"]),
                ),
            )
        ).all()
        # Merge emergency care at the top
        seen_care_ids = {c.id for c in emergency_care}
        matched_care = list(emergency_care) + [c for c in matched_care if c.id not in seen_care_ids]
        matched_care = matched_care[:4]

    # If no care options matched, supply public helplines (104, 1075)
    if not matched_care:
        general_helplines = db.scalars(
            select(Resource).where(
                Resource.active.is_(True),
                Resource.kind == "care",
                Resource.id.in_(["care-helpline-104", "care-helpline-1075"]),
            )
        ).all()
        matched_care = list(general_helplines)

    # 3. Determine Urgency and Match Status
    has_matching = bool(matched_info or is_emergency)
    if is_emergency:
        urgency: Literal["emergency", "seek_consultation", "self_care_education", "unclear"] = "emergency"
    elif has_matching:
        # Check if matched topic warrants clinical consultation
        consultation_topics = {"info-topic-dengue-warning", "info-topic-tuberculosis-awareness", "info-topic-maternal-antenatal"}
        if any(t.id in consultation_topics for t in matched_info):
            urgency = "seek_consultation"
        else:
            urgency = "self_care_education"
    else:
        urgency = "unclear"

    # 4. Synthesize Actionable Steps
    suggested_actions: list[str] = []
    if is_emergency:
        suggested_actions.extend([
            "Call the 24x7 National Ambulance Helpline at 108 or emergency number 112 immediately.",
            "Keep the affected individual calm, seated, or in the recovery position; do not leave them unattended.",
            "Proceed immediately to the nearest hospital casualty or emergency trauma facility.",
            "Do not delay transport for unverified home remedies or over-the-counter self-medication.",
        ])
    elif has_matching:
        for t in matched_info:
            if t.id in TOPIC_ACTIONS:
                suggested_actions.extend(TOPIC_ACTIONS[t.id])
                break
        if not suggested_actions:
            suggested_actions.extend([
                "Review the verified health education resources listed below to understand supportive home care.",
                "Maintain adequate fluid hydration, balanced nutrition, and adequate physical rest.",
                "If symptoms persist for more than 48 hours or worsen, visit your nearest Primary Health Centre or registered medical practitioner.",
            ])
    else:
        suggested_actions.extend([
            "Consult a registered doctor at your local primary health centre or clinic for personalized clinical evaluation.",
            "Call the national health information helpline at 104 or 1075 for free 24x7 telephone guidance.",
            "If symptoms suddenly worsen or become severe, seek immediate emergency medical care.",
        ])

    # 5. Build Summary (Deterministic or Optional AI-synthesized)
    topics_out = [GuidanceTopic.model_validate(t) for t in matched_info]
    care_out = [GuidanceCare.model_validate(c) for c in matched_care]
    contains_samples = any(t.is_sample for t in topics_out) or any(c.is_sample for c in care_out)

    ai_generated = False
    ai_status: Literal["opted_out", "not_configured", "generated", "failed"] = "opted_out"
    summary_text = ""

    if payload.allow_ai_synthesis and has_matching and not is_emergency:
        ai_summary, ai_status = _try_ai_synthesis(settings, raw_query, topics_out)
        if ai_summary:
            summary_text = ai_summary
            ai_generated = True

    if not summary_text:
        if is_emergency:
            summary_text = (
                "EMERGENCY WARNING: Your reported symptoms contain indicators associated with an acute medical emergency. "
                "Immediate in-person medical evaluation is required. Please call 108 or 112 or visit the nearest emergency hospital."
            )
        elif has_matching:
            titles = ", ".join(f"'{t.title}'" for t in topics_out[:2])
            summary_text = (
                f"Based on your question, we found verified educational guidance under {titles}. "
                "Review the clinical steps and supportive home measures below, and consult a registered medical professional if symptoms persist."
            )
        else:
            summary_text = (
                "No reliable matching health information was found in our verified database for your specific query. "
                "For safe guidance, please consult a registered medical practitioner or call the National Health Helpline at 104 or 1075."
            )

    # Structured logging with sensitive health query privacy preservation:
    log.info(
        "guidance processed lang=%s query_len=%d emergency=%s urgency=%s topics_count=%d care_count=%d ai=%s",
        payload.language,
        len(raw_query),
        is_emergency,
        urgency,
        len(topics_out),
        len(care_out),
        ai_status,
    )

    return GuidanceOut(
        is_emergency=is_emergency,
        urgency_level=urgency,
        emergency_notice=emergency_notice,
        has_matching_information=has_matching,
        summary=summary_text,
        suggested_actions=suggested_actions,
        topics=topics_out,
        care_options=care_out,
        disclaimer=DISCLAIMER,
        ai_generated=ai_generated,
        ai_status=ai_status,
        contains_sample_data=contains_samples,
        created_at=datetime.now(timezone.utc),
    )
