import { useState, useRef } from "react";
import Button from "../components/Button";
import Icon from "../components/Icon";
import { PageHero } from "../components/ui";
import { safeUrl } from "../api/resources";
import {
  fetchGuidance,
  type GuidanceOut,
  type UrgencyLevel,
  type DurationType,
  type AgeGroupType,
} from "../api/guidance";
import { ApiError } from "../api/client";

interface SymptomOption {
  id: string;
  en: string;
  hi: string;
  isDanger?: boolean;
}

const CONTROLLED_SYMPTOMS: SymptomOption[] = [
  { id: "fever", en: "Fever", hi: "बुखार" },
  { id: "cough", en: "Cough", hi: "खांसी" },
  { id: "shortness_of_breath", en: "Shortness of Breath", hi: "सांस में तकलीफ", isDanger: true },
  { id: "chest_pain", en: "Chest Pain / Pressure", hi: "छाती में दर्द", isDanger: true },
  { id: "loose_motion_diarrhea", en: "Loose Motion / Diarrhea", hi: "दस्त" },
  { id: "vomiting", en: "Vomiting", hi: "उल्टी" },
  { id: "headache", en: "Headache", hi: "सिरदर्द" },
  { id: "abdominal_pain", en: "Stomach Pain", hi: "पेट दर्द" },
  { id: "body_aches_joint_pain", en: "Severe Body / Joint Aches", hi: "बदन व जोड़ों में दर्द" },
  { id: "skin_rash", en: "Skin Rash", hi: "त्वचा पर चकत्ते" },
  { id: "fatigue_weakness", en: "Extreme Fatigue", hi: "अत्यधिक कमजोरी" },
  { id: "dizziness_fainting", en: "Dizziness / Fainting", hi: "चक्कर / बेहोशी" },
];

const CLINICAL_PRESETS = [
  {
    title: "⚠️ Cardiac Red-Flag",
    desc: "Severe chest pain & breathlessness",
    symptoms: ["chest_pain", "shortness_of_breath"],
    duration: "less_than_24h" as DurationType,
    age: "adult" as AgeGroupType,
    query: "Severe crushing chest pain radiating to left arm with breathlessness",
    isEmergency: true,
  },
  {
    title: "👶 Pediatric Dehydration",
    desc: "Child vomiting & loose motions",
    symptoms: ["loose_motion_diarrhea", "vomiting"],
    duration: "1_to_3_days" as DurationType,
    age: "child" as AgeGroupType,
    query: "Child has watery stools and vomiting, very thirsty and dry lips",
    isEmergency: false,
  },
  {
    title: "🦟 Dengue Warning Signs",
    desc: "High fever & body/joint aches",
    symptoms: ["fever", "body_aches_joint_pain", "headache"],
    duration: "1_to_3_days" as DurationType,
    age: "adult" as AgeGroupType,
    query: "High fever with retro-orbital headache and joint pain for 3 days",
    isEmergency: false,
  },
  {
    title: "🫁 Chronic Cough (>2 Weeks)",
    desc: "TB screening criteria (NTEP)",
    symptoms: ["cough", "fatigue_weakness"],
    duration: "more_than_2_weeks" as DurationType,
    age: "adult" as AgeGroupType,
    query: "Continuous cough with night sweats for more than two weeks",
    isEmergency: false,
  },
  {
    title: "🤰 Maternal Antenatal Care",
    desc: "Pregnancy checkups & caution",
    symptoms: ["vomiting", "fatigue_weakness"],
    duration: "1_to_3_days" as DurationType,
    age: "adult" as AgeGroupType,
    isPregnant: true,
    query: "Pregnant mother in second trimester experiencing persistent nausea and weakness",
    isEmergency: false,
  },
  {
    title: "Out-of-Scope Query",
    desc: "Testing unmatched safety",
    symptoms: [],
    duration: "unknown" as DurationType,
    age: "unspecified" as AgeGroupType,
    query: "Quantum matrix optimization algorithms for computing eigenvalues",
    isEmergency: false,
  },
];

const URGENCY_LABELS: Record<UrgencyLevel, { label: string; className: string }> = {
  emergency: { label: "Critical Emergency: Immediate Hospital Care", className: "urgency-emergency" },
  seek_consultation: { label: "Medical Consultation Advised", className: "urgency-seek_consultation" },
  self_care_education: { label: "Verified Self-Care & Education", className: "urgency-self_care_education" },
  unclear: { label: "Unmatched in Knowledge Base", className: "urgency-unclear" },
};

export default function Guidance() {
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [duration, setDuration] = useState<DurationType>("1_to_3_days");
  const [ageGroup, setAgeGroup] = useState<AgeGroupType>("adult");
  const [isPregnant, setIsPregnant] = useState(false);
  const [locationHint, setLocationHint] = useState("");
  const [query, setQuery] = useState("");
  const [allowAi, setAllowAi] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [result, setResult] = useState<GuidanceOut | null>(null);
  const [copied, setCopied] = useState(false);

  const formRef = useRef<HTMLDivElement | null>(null);
  const resultRef = useRef<HTMLDivElement | null>(null);

  const toggleSymptom = (id: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
    if (fieldError) setFieldError(null);
  };

  const handleApplyPreset = (preset: typeof CLINICAL_PRESETS[0]) => {
    setSelectedSymptoms(preset.symptoms);
    setDuration(preset.duration);
    setAgeGroup(preset.age);
    setIsPregnant(Boolean(preset.isPregnant));
    setQuery(preset.query);
    setFieldError(null);
    setError(null);
    handleExecuteGuidance({
      primary_symptoms: preset.symptoms,
      duration: preset.duration,
      age_group: preset.age,
      is_pregnant: Boolean(preset.isPregnant),
      query: preset.query,
      location_hint: locationHint,
      allow_ai_synthesis: allowAi,
    });
  };

  const handleExecuteGuidance = async (payload: {
    primary_symptoms: string[];
    duration: DurationType;
    age_group: AgeGroupType;
    is_pregnant: boolean;
    query?: string | null;
    location_hint?: string;
    allow_ai_synthesis?: boolean;
  }) => {
    if ((!payload.query || payload.query.trim().length < 2) && payload.primary_symptoms.length === 0) {
      setFieldError("Please select at least one symptom or type a question describing your health concern.");
      return;
    }
    setFieldError(null);
    setError(null);
    setLoading(true);

    try {
      const data = await fetchGuidance({
        primary_symptoms: payload.primary_symptoms,
        duration: payload.duration,
        age_group: payload.age_group,
        is_pregnant: payload.is_pregnant,
        query: payload.query ? payload.query.trim() : null,
        location_hint: payload.location_hint ? payload.location_hint.trim() : null,
        allow_ai_synthesis: payload.allow_ai_synthesis,
      });
      setResult(data);
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.fields.query) {
          setFieldError(err.fields.query);
        } else {
          setError(err.message);
        }
      } else {
        setError("Unable to process health guidance right now. Please check server connection.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopyHandover = () => {
    if (!result?.doctor_summary) return;
    navigator.clipboard.writeText(result.doctor_summary).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handlePrintHandover = () => {
    window.print();
  };

  const handleReset = () => {
    setSelectedSymptoms([]);
    setDuration("1_to_3_days");
    setAgeGroup("adult");
    setIsPregnant(false);
    setQuery("");
    setLocationHint("");
    setResult(null);
    setFieldError(null);
    setError(null);
    formRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <PageHero
        eyebrow="CarePath Intelligence"
        title={
          <>
            From symptoms to <em>safe care</em>.
          </>
        }
        lead="A structured, safety-first clinical navigation companion. Select symptoms, review automated danger signs, and generate a reviewable clinical summary to share with your doctor."
      />

      <section className="section container tight">
        <div className="guidance-box" ref={formRef}>
          {/* Quick Presets Bar */}
          <div>
            <div className="guidance-header">
              <span className="eyebrow" style={{ marginBottom: 0 }}>
                1-Click Clinical Demonstration Scenarios
              </span>
              <span className="badge-source">Select a scenario to test instant triage</span>
            </div>
            <div className="prompt-chips" role="group" aria-label="Demo clinical scenarios">
              {CLINICAL_PRESETS.map((p) => (
                <button
                  key={p.title}
                  type="button"
                  className={`prompt-chip ${p.isEmergency ? "emergency" : ""}`}
                  onClick={() => handleApplyPreset(p)}
                  title={p.desc}
                >
                  {p.title}
                </button>
              ))}
            </div>
          </div>

          <hr style={{ border: 0, borderTop: "1px solid var(--line)" }} />

          {/* Form Intake */}
          <form
            className="guidance-form"
            onSubmit={(e) => {
              e.preventDefault();
              handleExecuteGuidance({
                primary_symptoms: selectedSymptoms,
                duration,
                age_group: ageGroup,
                is_pregnant: isPregnant,
                query: query || null,
                location_hint: locationHint || undefined,
                allow_ai_synthesis: allowAi,
              });
            }}
          >
            {/* Step 1: Primary Symptoms */}
            <div>
              <label className="eyebrow" style={{ marginBottom: 6 }}>
                Step 1: Select Primary Symptoms / मुख्य लक्षण
              </label>
              <p className="form-note" style={{ marginBottom: 10 }}>
                Tap all symptoms currently experienced. Red-tinted items represent potential emergency indicators:
              </p>
              <div className="symptom-tag-grid" role="group" aria-label="Primary symptoms">
                {CONTROLLED_SYMPTOMS.map((s) => {
                  const active = selectedSymptoms.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      className={`symptom-pill ${s.isDanger ? "danger" : ""} ${active ? "active" : ""}`}
                      onClick={() => toggleSymptom(s.id)}
                      aria-pressed={active}
                    >
                      {active ? "✓ " : s.isDanger ? "⚠️ " : "+ "}
                      <span>{s.en}</span>
                      <small style={{ opacity: 0.75 }}>({s.hi})</small>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Patient Context Grid */}
            <div>
              <label className="eyebrow" style={{ marginBottom: 6 }}>
                Step 2: Clinical Context & Demographics
              </label>
              <div className="context-grid">
                <div className="context-item">
                  <label htmlFor="duration-select">Duration of Symptoms</label>
                  <select
                    id="duration-select"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value as DurationType)}
                  >
                    <option value="less_than_24h">&lt; 24 hours (Under a day)</option>
                    <option value="1_to_3_days">1 to 3 days</option>
                    <option value="4_to_14_days">4 to 14 days</option>
                    <option value="more_than_2_weeks">&gt; 2 weeks (Chronic cough / persistent)</option>
                    <option value="unknown">Unsure / Unknown</option>
                  </select>
                </div>

                <div className="context-item">
                  <label htmlFor="age-select">Patient Age Group</label>
                  <select
                    id="age-select"
                    value={ageGroup}
                    onChange={(e) => setAgeGroup(e.target.value as AgeGroupType)}
                  >
                    <option value="infant">Infant (&lt; 1 year)</option>
                    <option value="child">Child (1 to 12 years)</option>
                    <option value="adult">Adult (13 to 64 years)</option>
                    <option value="elderly">Elderly (65+ years)</option>
                    <option value="unspecified">Unspecified</option>
                  </select>
                </div>

                <div className="context-item">
                  <label htmlFor="location-hint">Location / City Hint</label>
                  <input
                    id="location-hint"
                    type="text"
                    value={locationHint}
                    placeholder="e.g. New Delhi"
                    onChange={(e) => setLocationHint(e.target.value)}
                  />
                </div>

                <div className="context-item" style={{ display: "flex", alignItems: "flex-end", paddingBottom: 6 }}>
                  <label className="toggle-row" style={{ fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={isPregnant}
                      onChange={(e) => setIsPregnant(e.target.checked)}
                    />
                    <span>Pregnant patient (गर्भवती)</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Step 3: Optional Free-Text Description */}
            <div className={`field ${fieldError ? "has-error" : ""}`}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <label htmlFor="guidance-query" style={{ fontSize: "13px", fontWeight: 600 }}>
                  Step 3: Additional Notes / Questions (Optional)
                </label>
                <span className="char-count">{query.length} / 500</span>
              </div>
              <textarea
                id="guidance-query"
                rows={3}
                maxLength={500}
                value={query}
                placeholder="Describe any other symptoms or context (e.g. temperature recorded, medicines already taken, appetite)..."
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (fieldError) setFieldError(null);
                }}
              />
              {fieldError && (
                <p className="field-error" role="alert">
                  {fieldError}
                </p>
              )}
            </div>

            {/* Step 4: Settings & Submission */}
            <div className="guidance-bar">
              <label className="toggle-row" title="Opt-in to Gemini LLM synthesis. When unconfigured, runs 100% deterministically from verified local clinical database.">
                <input
                  type="checkbox"
                  checked={allowAi}
                  onChange={(e) => setAllowAi(e.target.checked)}
                />
                <span>Enable optional AI synthesis (if server credentials configured)</span>
              </label>

              <div style={{ display: "flex", gap: "10px" }}>
                {(selectedSymptoms.length > 0 || query) && (
                  <Button type="button" variant="line" onClick={handleReset}>
                    Reset Form
                  </Button>
                )}
                <Button type="submit" variant="navy" disabled={loading}>
                  {loading ? "Evaluating CarePath…" : "Evaluate CarePath & Triage"}
                </Button>
              </div>
            </div>

            {/* Privacy Transparency Notice */}
            <div className="privacy-badge">
              <Icon name="shield" size={18} />
              <span>
                <strong>Privacy Guaranteed:</strong> Symptom intake is processed in-memory for safety screening.
                No personal health records or confidential queries are logged or retained.
              </span>
            </div>
          </form>

          {error && (
            <div className="alert alert-error" role="alert">
              <Icon name="alert" size={20} />
              <span>{error}</span>
            </div>
          )}

          {/* Results Section */}
          <div ref={resultRef} aria-live="polite" aria-busy={loading}>
            {result && (
              <div className="guidance-result-card">
                {/* 1. Emergency Banner */}
                {result.is_emergency && (
                  <div className="emergency-banner" role="alert">
                    <h3>
                      <Icon name="alert" size={24} />
                      CRITICAL EMERGENCY DETECTED: Immediate Medical Care Required
                    </h3>
                    <p>{result.emergency_notice}</p>
                    <div className="emergency-actions">
                      <a href="tel:108" className="emergency-btn">
                        <Icon name="pin" size={18} />
                        Call Ambulance (108)
                      </a>
                      <a href="tel:112" className="emergency-btn">
                        <Icon name="pin" size={18} />
                        Call Emergency (112)
                      </a>
                    </div>
                  </div>
                )}

                {/* 2. Sample Data Warning */}
                {result.contains_sample_data && (
                  <div className="alert alert-info" role="note">
                    <Icon name="alert" size={20} />
                    <span>
                      Some entries below are tagged as <strong>Sample data</strong> for local testing. Never treat
                      sample records as verified real healthcare facilities.
                    </span>
                  </div>
                )}

                {/* 3. Urgency & Mode Pill */}
                <div className="urgency-row">
                  <span className={`urgency-pill ${URGENCY_LABELS[result.urgency_level].className}`}>
                    {URGENCY_LABELS[result.urgency_level].label}
                  </span>
                  <span className="ai-note">
                    {result.ai_generated
                      ? "🤖 Grounded AI Synthesis"
                      : result.ai_status === "failed"
                      ? "⚡ Deterministic (AI fallback)"
                      : "✓ Deterministic Clinical Guideline"}
                  </span>
                </div>

                {/* 4. Guidance Summary */}
                <div className="guidance-summary">
                  <p>{result.summary}</p>
                </div>

                {/* 5. Explainable Clinical Rationale */}
                {result.explainable_rationale && (
                  <div className="rationale-box">
                    <h4>Clinical Rationale & Guideline Attribution</h4>
                    <p>{result.explainable_rationale}</p>
                  </div>
                )}

                {/* 6. Contraindications & Drug Safety Warnings */}
                {result.contraindications.length > 0 && (
                  <div className="contraindication-card" role="alert">
                    <h4>
                      <Icon name="alert" size={18} />
                      Important Drug & Clinical Safety Warnings
                    </h4>
                    <ul>
                      {result.contraindications.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 7. Actionable Next Steps */}
                {result.suggested_actions.length > 0 && (
                  <div className="actions-section">
                    <h4>Recommended Next Steps & Clinical Awareness</h4>
                    <ul className="action-list">
                      {result.suggested_actions.map((act, idx) => (
                        <li key={idx} className="action-item">
                          <Icon name="check" size={18} />
                          <span>{act}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 8. CarePath Doctor Handover / Clinical Summary Card */}
                {result.doctor_summary && (
                  <div className="doctor-handover">
                    <div className="doctor-handover-header">
                      <div>
                        <span className="doctor-handover-title">CarePath Clinical Handover Summary</span>
                        <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#94a3b8" }}>
                          Reviewable clinical summary ready to share with an ASHA worker, community clinic, or physician.
                        </p>
                      </div>
                      <div className="handover-btn-row">
                        <button
                          type="button"
                          className={`handover-btn ${copied ? "copied" : ""}`}
                          onClick={handleCopyHandover}
                        >
                          <Icon name={copied ? "check" : "doc"} size={16} />
                          {copied ? "Copied to Clipboard!" : "Copy Summary"}
                        </button>
                        <button type="button" className="handover-btn" onClick={handlePrintHandover}>
                          <Icon name="arrow" size={16} />
                          Print / Save PDF
                        </button>
                      </div>
                    </div>
                    <pre>{result.doctor_summary}</pre>
                  </div>
                )}

                {/* 9. Verified Educational Topics */}
                {result.topics.length > 0 && (
                  <div>
                    <h3 className="sub-heading">Traceable Health Education Topics</h3>
                    <div className="grid-2 mt-20">
                      {result.topics.map((t) => {
                        const href = safeUrl(t.url);
                        const verified = t.last_verified_at
                          ? new Date(t.last_verified_at).toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })
                          : null;
                        return (
                          <div key={t.id} className="result card" style={{ flexDirection: "column" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span className="tag">{t.category}</span>
                              {t.is_sample && <span className="tag-sample">Sample</span>}
                            </div>
                            <h3>{t.title}</h3>
                            <p>{t.summary}</p>
                            <p className="meta badge-source">
                              Source: {t.source}
                              {verified ? ` · Verified ${verified}` : " · Unverified"}
                            </p>
                            {href && (
                              <a className="text-link" href={href} target="_blank" rel="noopener noreferrer">
                                Read authoritative guidance <Icon name="arrow" size={16} />
                              </a>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 10. Relevant Care Facilities & Helplines */}
                {result.care_options.length > 0 && (
                  <div>
                    <h3 className="sub-heading">
                      {result.is_emergency ? "Emergency Care & Helplines" : "Relevant Healthcare Facilities & Helplines"}
                    </h3>
                    <div className="grid-2 mt-20">
                      {result.care_options.map((c) => {
                        const href = safeUrl(c.url);
                        return (
                          <div key={c.id} className="result card" style={{ flexDirection: "column" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span className="tag" style={{ color: "var(--blue)" }}>
                                {c.category}
                              </span>
                              {c.is_sample && <span className="tag-sample">Sample</span>}
                            </div>
                            <h3>{c.title}</h3>
                            <p>{c.summary}</p>
                            {c.contact && (
                              <p className="meta" style={{ fontWeight: 600, color: "var(--navy)" }}>
                                📞 Contact:{" "}
                                <a href={`tel:${c.contact.replace(/[^0-9+]/g, "")}`} style={{ textDecoration: "underline" }}>
                                  {c.contact}
                                </a>
                              </p>
                            )}
                            {c.location && <p className="meta">📍 {c.location}</p>}
                            <p className="meta badge-source">Source: {c.source}</p>
                            {href && (
                              <a className="text-link" href={href} target="_blank" rel="noopener noreferrer">
                                Official facility portal <Icon name="arrow" size={16} />
                              </a>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 11. Disclaimer */}
                <div className="note" style={{ marginTop: 12 }}>
                  <strong>Disclaimer:</strong> {result.disclaimer}
                </div>
              </div>
            )}
          </div>
        </div>

        <p className="disclaimer">
          Sehat Saathi is an educational and healthcare navigation companion. It is not an automated medical diagnostic
          system and does not issue prescription medication orders. If you are experiencing serious or sudden symptoms,
          call national emergency services immediately at 108 or 112.
        </p>
      </section>
    </>
  );
}
