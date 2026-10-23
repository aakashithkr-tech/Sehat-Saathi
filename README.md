# Sehat Saathi

Healthcare discovery and access platform. **It is not a diagnostic service and does not replace a qualified healthcare professional.** Listings never guarantee that a service is currently offered or available; users are told to contact the provider before travelling.

## Architecture

```
sehat-saathii/
├─ src/                  React 19 + Vite + TypeScript frontend (unchanged design)
│  ├─ api/client.ts      shared fetch client, reads VITE_API_BASE_URL, typed ApiError
│  ├─ api/contact.ts     POST /api/v1/contact
│  ├─ api/resources.ts   GET  /api/v1/resources, /categories
│  └─ hooks/useResources.ts  server-side search/filter/pagination
├─ backend/              FastAPI + SQLAlchemy + SQLite (PostgreSQL-compatible)
│  ├─ app/main.py        app factory, CORS, error handlers, startup
│  ├─ app/routers/       health, contact, resources
│  ├─ app/services/      contact, resources, email (optional SMTP), rate limiter
│  ├─ app/models/        contact_messages, resources
│  ├─ app/seed.py        sample seeding + verified-data import
│  ├─ data/resources.sample.json   clearly labelled SAMPLE records
│  └─ tests/             pytest, isolated temp database per test
└─ .env.example          frontend env (backend has backend/.env.example)
```

## Prerequisites
Node.js 20+ and Python 3.11+ (on Windows, the `py` launcher).

## Run locally (Windows PowerShell)

Adjust the path if your folder differs. Open **two** PowerShell windows.

**Window 1: backend**
```powershell
cd C:\Users\aakas\Downloads\sehat-saathii\backend
py -m venv .venv
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass   # only if activation is blocked
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
if (-not (Test-Path .env)) { Copy-Item .env.example .env }   # never overwrites an existing .env
uvicorn app.main:app --reload --port 8000
```
API docs (development only): http://localhost:8000/docs · health: http://localhost:8000/health

The SQLite file `backend\sehat_saathi.db` and its tables are created automatically on first start.

**Window 2: frontend**
```powershell
cd C:\Users\aakas\Downloads\sehat-saathii
npm install
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
npm run dev
```
Open http://localhost:5173.

## Configuration

Backend (`backend/.env`, see `backend/.env.example`): `APP_ENV`, `DATABASE_URL`, `CORS_ORIGINS` (exact origins; `*` is ignored), `SEED_SAMPLE_DATA`, rate-limit settings, optional `SMTP_*` / `CONTACT_NOTIFY_TO`.

Frontend (`.env.local`): `VITE_API_BASE_URL`. Defaults to `http://localhost:8000` only in `npm run dev`. A production build **must** set it, otherwise the UI shows an explicit configuration message. Never put secrets in `VITE_*` variables; they are public.

## API

| Method | Path | Notes |
|---|---|---|
| GET | `/health` | `{"status":"ok","database":"ok"}`, 503 if DB unreachable |
| POST | `/api/v1/contact` | body `{name, email, topic, message}` (`subject` accepted as alias for `topic`). 201 stored · 200 duplicate · 422 validation (`{detail, fields}`) · 429 rate-limited (`Retry-After`) |
| GET | `/api/v1/resources` | filters: `kind` (information\|care), `category`, `language`, `search`, `page`, `page_size` (≤100). Returns `{items,total,page,page_size,pages}` |
| GET | `/api/v1/resources/categories` | optional `kind`; returns `[{name,count}]` |
| GET | `/api/v1/resources/{id}` | 404 if missing or inactive |
| POST | `/api/v1/guidance` | body `{query, language?, allow_ai_synthesis?}`. Returns structured triage: `is_emergency`, `urgency_level`, `emergency_notice`, `suggested_actions`, `topics`, `care_options`, `disclaimer`, `ai_generated`, `ai_status`. |

There is deliberately **no GET endpoint for contact messages**.

### Health Guidance Response Example

```json
{
  "is_emergency": false,
  "urgency_level": "self_care_education",
  "emergency_notice": null,
  "has_matching_information": true,
  "summary": "Based on your question, we found verified educational guidance under 'Dehydration and Acute Diarrhea: Oral Rehydration Guidelines'.",
  "suggested_actions": [
    "Prepare WHO-formula Oral Rehydration Salts (ORS) in clean drinking water and sip continuously after every loose stool.",
    "Continue light nutrition (rice kanji, thin dal, banana, curd) to prevent nutritional depletion.",
    "Seek medical care at a Primary Health Centre if unable to keep fluids down or fever is high."
  ],
  "topics": [
    {
      "id": "info-topic-dehydration-ors",
      "title": "Dehydration and Acute Diarrhea: Oral Rehydration Guidelines",
      "summary": "Guidelines on managing fluid loss from acute diarrhea and vomiting using WHO-standard ORS...",
      "category": "Gastroenterology & Hydration",
      "source": "WHO Diarrhoeal Disease Fact Sheet & MoHFW Standard Treatment Workflows",
      "url": "https://www.who.int/news-room/fact-sheets/detail/diarrhoeal-disease",
      "last_verified_at": "2026-10-01T00:00:00+00:00",
      "is_sample": false
    }
  ],
  "care_options": [
    {
      "id": "care-facility-ayushman-arogya",
      "title": "Ayushman Arogya Mandir (Health and Wellness Centres)",
      "category": "Primary Care",
      "contact": "Visit nearest local centre / Call 104",
      "source": "Ayushman Bharat National Health Authority",
      "is_sample": false
    }
  ],
  "disclaimer": "MEDICAL DISCLAIMER: Sehat Saathi provides verified educational health guidance only...",
  "ai_generated": false,
  "ai_status": "opted_out",
  "contains_sample_data": false,
  "created_at": "2026-10-23T14:00:00Z"
}
```

## Legitimate Healthcare Data Sources Evaluated

1. **Open Government Data (OGD) Platform India (`data.gov.in`)**:
   - *Dataset*: Directory of Government Hospitals & Community Health Centres (CHCs) by MoHFW.
   - *Cost & Access*: Free public access via National Data Sharing and Accessibility Policy (NDSAP).
   - *Limitations & Freshness*: Updates depend on periodic state submissions; contact numbers must be verified against current facility listings.
2. **National Health Authority (NHA) / Ayushman Bharat PM-JAY Empanelled Providers**:
   - *Dataset*: Public directory of public and private empanelled hospitals (`hospitals.pmjay.gov.in`).
   - *Cost & Access*: Free public web directory; no open unauthenticated REST API, bulk lists available via official state health authority notices.
3. **National Health Portal & National Emergency Networks**:
   - *Helplines*: 108 (24x7 Emergency Medical Response & Ambulance), 102 (Janani Shishu Suraksha Karyakram free maternal/neonatal transport), 104 (State Health Advice & Blood Bank Directory), 14416 (Tele-MANAS Mental Health), 1075 (National Health Advisory).
   - *Freshness*: Permanent, authoritative national public health infrastructure. Bundled in `backend/data/verified_resources.json`.
4. **Authoritative Clinical Education Standards**:
   - WHO Guidelines, Indian Council of Medical Research (ICMR) Standard Treatment Workflows, and MoHFW National Health Mission educational materials. Bundled with source URLs and verification timestamps.

## Database Seeding and Verified Data Import

The project preserves a strict distinction between placeholder sample records (`is_sample=true`) and verified public resources (`is_sample=false`).

- **Import bundled verified healthcare resources**:
  ```powershell
  python -m app.seed --verified
  ```
- **Import custom verified JSON dataset and purge samples**:
  ```powershell
  python -m app.seed --file verified.json --remove-samples
  ```
- **Seed sample placeholder data for local dev**:
  ```powershell
  python -m app.seed
  ```

## Tests

Run the complete test suite (all 53 tests pass):

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python -m pytest -v
cd ..
npm run build
```

## Production Notes
- Set `APP_ENV=production` (disables `/docs`), `SEED_SAMPLE_DATA=false`, `SEED_VERIFIED_DATA=true`.
- Optional AI synthesis: set `AI_GUIDANCE_ENABLED=true` and `GEMINI_API_KEY=your_key`. When disabled or unconfigured, the application runs 100% deterministically from verified local clinical resources.
- Sensitive user health queries are NEVER logged to server logs.

