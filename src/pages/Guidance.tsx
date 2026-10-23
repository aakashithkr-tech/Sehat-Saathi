import { useState } from "react";
import Button from "../components/Button";
import Icon from "../components/Icon";
import { PageHero } from "../components/ui";


import { safeUrl } from "../api/resources";
import { fetchGuidance, type GuidanceOut, type UrgencyLevel } from "../api/guidance";
import { ApiError } from "../api/client";

const SAMPLE_PROMPTS = [
  {
    label: "Emergency: Chest pain & arm numbness",
    query: "Severe crushing chest pain radiating to left arm and shortness of breath",
    isEmergency: true,
  },
  {
    label: "Acute Care: Child diarrhea & dehydration",
    query: "Child has loose motion and vomiting, very thirsty and dry mouth",
    isEmergency: false,
  },
  {
    label: "Infectious: Dengue fever warning signs",
    query: "High fever with severe body pain and headache behind eyes, suspected dengue",
    isEmergency: false,
  },
  {
    label: "Maternal: Pregnancy antenatal checks",
    query: "What essential checkups and danger signs should a pregnant mother know in second trimester?",
    isEmergency: false,
  },
  {
    label: "Chronic: High blood pressure care",
    query: "High blood pressure reading 150/95 and how to manage sodium and lifestyle",
    isEmergency: false,
  },
  {
    label: "Out of scope test",
    query: "Quantum physics algorithms and numerical methods for matrix diagonalization",
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
  const [query, setQuery] = useState("");
  const [allowAi, setAllowAi] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [result, setResult] = useState<GuidanceOut | null>(null);

  const handleSubmit = async (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const text = (customQuery ?? query).trim();
    if (text.length < 2) {
      setFieldError("Please write at least 2 characters describing your health concern.");
      return;
    }
    setFieldError(null);
    setError(null);
    setLoading(true);

    try {
      const data = await fetchGuidance({
        query: text,
        allow_ai_synthesis: allowAi,
      });
      setResult(data);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.fields.query) {
          setFieldError(err.fields.query);
        } else {
          setError(err.message);
        }
      } else {
        setError("Something went wrong while evaluating your query. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePromptClick = (promptText: string) => {
    setQuery(promptText);
    setFieldError(null);
    handleSubmit(undefined, promptText);
  };

  return (
    <>
      <PageHero
        eyebrow="Health Guidance & Triage"
        title={
          <>
            Symptom guidance and <em>care companion</em>.
          </>
        }
        lead="Describe your symptoms or health question to receive verified educational guidance, clinical danger sign checks, and direct paths to legitimate healthcare support."
      />

      <section className="section container tight">
        <div className="guidance-box">
          <div>
            <div className="guidance-header">
              <label htmlFor="guidance-query" className="eyebrow" style={{ marginBottom: 0 }}>
                Describe your symptom or health question
              </label>
              <span className="char-count" aria-live="polite">
                {query.length} / 500 characters
              </span>
            </div>

            <p className="form-note mt-20" style={{ marginTop: 6, marginBottom: 12 }}>
              Click an example to test instant clinical safety screening, or type your own question:
            </p>

            <div className="prompt-chips" role="group" aria-label="Quick test examples">
              {SAMPLE_PROMPTS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  className={`prompt-chip ${p.isEmergency ? "emergency" : ""}`}
                  onClick={() => handlePromptClick(p.query)}
                >
                  {p.isEmergency ? "⚠️ " : ""}
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <form className="guidance-form" onSubmit={(e) => handleSubmit(e)}>
            <div className={`field ${fieldError ? "has-error" : ""}`}>
              <textarea
                id="guidance-query"
                rows={4}
                maxLength={500}
                value={query}
                placeholder="e.g., My 4-year-old child has had watery loose motions and vomiting since morning, what should I do?"
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

            <div className="guidance-bar">
              <label className="toggle-row" title="Strictly opt-in. When disabled or unconfigured, uses deterministic database retrieval.">
                <input
                  type="checkbox"
                  checked={allowAi}
                  onChange={(e) => setAllowAi(e.target.checked)}
                />
                <span>Allow optional AI synthesis (if server credentials configured)</span>
              </label>

              <div style={{ display: "flex", gap: "10px" }}>
                {query && (
                  <Button
                    type="button"
                    variant="line"
                    onClick={() => {
                      setQuery("");
                      setResult(null);
                      setFieldError(null);
                      setError(null);
                    }}
                  >
                    Clear
                  </Button>
                )}
                <Button type="submit" variant="navy" disabled={loading}>
                  {loading ? "Evaluating…" : "Get Health Guidance"}
                </Button>
              </div>
            </div>
          </form>

          {error && (
            <div className="alert alert-error" role="alert">
              <Icon name="alert" size={20} />
              <span>{error}</span>
            </div>
          )}

          <div aria-live="polite" aria-busy={loading}>
            {result && (
              <div className="guidance-result-card">
                {result.is_emergency && (
                  <div className="emergency-banner" role="alert">
                    <h3>
                      <Icon name="alert" size={24} />
                      Emergency Warning: Immediate In-Person Care Required
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

                {result.contains_sample_data && (
                  <div className="alert alert-info" role="note">
                    <Icon name="alert" size={20} />
                    <span>
                      Some records below are marked as <strong>Sample data</strong> for local development. Never treat
                      sample records as real healthcare providers.
                    </span>
                  </div>
                )}

                <div className="urgency-row">
                  <span className={`urgency-pill ${URGENCY_LABELS[result.urgency_level].className}`}>
                    {URGENCY_LABELS[result.urgency_level].label}
                  </span>
                  <span className="ai-note">
                    {result.ai_generated
                      ? "🤖 Grounded AI Synthesis"
                      : result.ai_status === "failed"
                      ? "⚡ Deterministic (AI fallback)"
                      : "✓ Deterministic Clinical Screening"}
                  </span>
                </div>

                <div className="guidance-summary">
                  <p>{result.summary}</p>
                </div>

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

                {result.topics.length > 0 && (
                  <div>
                    <h3 className="sub-heading">Verified Health Education Topics</h3>
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

                <div className="note" style={{ marginTop: 12 }}>
                  <strong>Disclaimer:</strong> {result.disclaimer}
                </div>
              </div>
            )}
          </div>
        </div>

        <p className="disclaimer">
          Sehat Saathi is an educational and healthcare access companion. It is not an automated medical diagnostic
          system and does not issue prescription medication orders. If you are experiencing serious or sudden symptoms,
          call national emergency services immediately at 108 or 112.
        </p>
      </section>
    </>
  );
}
