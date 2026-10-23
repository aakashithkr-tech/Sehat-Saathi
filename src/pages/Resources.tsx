import { useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Icon from "../components/Icon";
import Button from "../components/Button";
import { IconBadge, PageHero } from "../components/ui";
import { useCategories, useResources } from "../hooks/useResources";
import { safeUrl, type Resource, type ResourceKind } from "../api/resources";

const TABS: { id: ResourceKind; label: string; empty: string }[] = [
  { id: "information", label: "Health information", empty: "health information" },
  { id: "care", label: "Care and services", empty: "care and services" },
];

interface CareNeed {
  id: string;
  label: string;
  emoji: string;
  desc: string;
  tab: ResourceKind;
  category: string;
  isEmergency?: boolean;
}

const CARE_NEEDS: CareNeed[] = [
  {
    id: "emergency",
    label: "Emergency Assistance",
    emoji: "🚨",
    desc: "Critical crises, trauma, poison control & 24x7 ambulance",
    tab: "care",
    category: "Emergency & Ambulance",
    isEmergency: true,
  },
  {
    id: "general",
    label: "General Healthcare",
    emoji: "🩺",
    desc: "104 medical advice, blood banking, OPD & health schemes",
    tab: "care",
    category: "Health Advice & Directory",
  },
  {
    id: "maternal",
    label: "Maternal & Child Care",
    emoji: "🤱",
    desc: "Janani Shishu transport (102), neonates & child protection",
    tab: "care",
    category: "Maternal & Child Transport",
  },
  {
    id: "mental",
    label: "Mental Health Support",
    emoji: "🧠",
    desc: "Free 24x7 psychiatric counseling & psychological first aid",
    tab: "care",
    category: "Mental Health & Counseling",
  },
  {
    id: "info",
    label: "Public Health Information",
    emoji: "📋",
    desc: "Verified guidance on conditions, hygiene, fever & prevention",
    tab: "information",
    category: "",
  },
];

export default function Resources() {
  const [params, setParams] = useSearchParams();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const tab: ResourceKind = params.get("tab") === "care" ? "care" : "information";
  const q = params.get("q") ?? "";
  const category = params.get("category") ?? "";
  const location = params.get("location") ?? "";
  const activeNeedId = params.get("need") ?? "";

  const update = (next: Record<string, string>) => {
    const p = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    setParams(p, { replace: true });
  };

  const handleSelectNeed = (need: CareNeed) => {
    if (activeNeedId === need.id) {
      // Toggle off
      update({ need: "", category: "", tab: need.tab });
    } else {
      update({
        need: need.id,
        tab: need.tab,
        category: need.category,
      });
    }
  };

  const categories = useCategories(tab).map((c) => c.name);
  const activeCategory = category;
  const { state, retry, loadMore, searching } = useResources(tab, q, category, location);
  const results = state.status === "ready" ? state.items : [];
  const hasSample = results.some((r) => r.is_sample);

  const activeNeed = CARE_NEEDS.find((n) => n.id === activeNeedId);
  const filtered = Boolean(q.trim() || activeCategory || location.trim() || activeNeedId);
  const tabLabel = TABS.find((t) => t.id === tab)!;

  const onTabKey = (e: React.KeyboardEvent, i: number) => {
    let n = i;
    if (e.key === "ArrowRight") n = (i + 1) % TABS.length;
    else if (e.key === "ArrowLeft") n = (i - 1 + TABS.length) % TABS.length;
    else if (e.key === "Home") n = 0;
    else if (e.key === "End") n = TABS.length - 1;
    else return;
    e.preventDefault();
    update({ tab: TABS[n].id, category: "", need: "" });
    tabRefs.current[n]?.focus();
  };

  return (
    <>
      <PageHero
        eyebrow="Health resources & Helplines"
        title={
          <>
            What are you <em>looking for?</em>
          </>
        }
        lead="Search health resources, verified national helplines, and pathways to reach care."
      />

      <section className="section container tight">
        {/* Cross-navigation Banner to Facility Directory */}
        <div className="cross-nav-banner">
          <span>Looking for local hospital and clinic availability with PIN code search?</span>
          <Link to="/facilities" className="cross-nav-link">
            Find Healthcare Facilities Directory <Icon name="arrow" size={16} />
          </Link>
        </div>

        {/* Priority 2: SMART CARE FINDER */}
        <div className="smart-care-finder-box">
          <div className="smart-finder-header">
            <div className="smart-finder-title">
              <IconBadge name="shield" tone="teal" size="md" />
              <div>
                <h3>Smart Care Finder</h3>
                <p>Select your healthcare need for transparent, rule-based matching to verified resources.</p>
              </div>
            </div>
            {activeNeed && (
              <button
                type="button"
                className="active-need-clear"
                onClick={() => update({ need: "", category: "" })}
              >
                Clear need filter
              </button>
            )}
          </div>

          <div className="smart-needs-grid" role="group" aria-label="Select healthcare need">
            {CARE_NEEDS.map((need) => (
              <button
                key={need.id}
                type="button"
                className={`smart-need-btn ${activeNeedId === need.id ? "active" : ""}`}
                onClick={() => handleSelectNeed(need)}
              >
                <span className="need-icon">{need.emoji}</span>
                <span className="need-label">{need.label}</span>
                <span className="need-desc">{need.desc}</span>
              </button>
            ))}
          </div>

          {/* Active Need Confirmation Banner */}
          {activeNeed && (
            <div className="active-need-banner">
              <div className="active-need-banner-content">
                <span>
                  Showing resources matching: <strong>{activeNeed.label}</strong>
                  {activeCategory ? ` (Category: ${activeCategory})` : ""}
                </span>
              </div>
              <button
                type="button"
                className="active-need-clear"
                onClick={() => update({ need: "", category: "" })}
              >
                Reset
              </button>
            </div>
          )}

          {/* Medical Safety Advisory for Emergencies */}
          {activeNeed?.isEmergency && (
            <div className="emergency-safety-banner" role="alert">
              <Icon name="alert" size={24} />
              <div>
                <strong>🚨 Immediate Medical Emergency Notice:</strong>
                <p>
                  If you or someone near you is experiencing severe breathing distress, chest pain, profuse bleeding, or
                  trauma, please call emergency ambulance services immediately. This directory is for discovery and
                  contact only.
                </p>
                <div className="emergency-call-chips">
                  <a href="tel:108" className="emergency-call-chip">
                    <Icon name="phone" size={14} /> Call Ambulance (108)
                  </a>
                  <a href="tel:102" className="emergency-call-chip">
                    <Icon name="phone" size={14} /> Call Maternal/Neonate (102)
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Directory Tabs */}
        <div className="tabs" role="tablist" aria-label="Resource type">
          {TABS.map((t, i) => (
            <button
              key={t.id}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              role="tab"
              id={`tab-${t.id}`}
              type="button"
              aria-selected={tab === t.id}
              aria-controls="resource-panel"
              tabIndex={tab === t.id ? 0 : -1}
              className="tab"
              onClick={() => update({ tab: t.id, category: "", need: "" })}
              onKeyDown={(e) => onTabKey(e, i)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div id="resource-panel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
          {/* Search Inputs */}
          <div style={{ display: "flex", gap: "10px", maxWidth: "720px", margin: "0 auto", flexWrap: "wrap" }}>
            <form className="searchbar" role="search" onSubmit={(e) => e.preventDefault()} style={{ flex: "2 1 320px" }}>
              <label htmlFor="q" className="sr-only">
                Search {tabLabel.empty}
              </label>
              <Icon name="search" size={20} strokeWidth={1.8} />
              <input
                id="q"
                type="search"
                value={q}
                placeholder={tab === "care" ? "Search hospital, helpline, or phone (e.g. 108)" : "Search a health topic"}
                autoComplete="off"
                onChange={(e) => update({ q: e.target.value })}
              />
              {q && (
                <button type="button" className="clear" onClick={() => update({ q: "" })}>
                  Clear
                </button>
              )}
            </form>

            <div className="searchbar" style={{ flex: "1 1 200px" }}>
              <Icon name="pin" size={20} strokeWidth={1.8} />
              <label htmlFor="location-filter" className="sr-only">
                Filter by location
              </label>
              <input
                id="location-filter"
                type="search"
                value={location}
                placeholder="Location (e.g. Delhi, National)"
                autoComplete="off"
                onChange={(e) => update({ location: e.target.value })}
              />
              {location && (
                <button type="button" className="clear" onClick={() => update({ location: "" })}>
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Category Chips */}
          {categories.length > 0 && (
            <div className="chips" role="group" aria-label="Filter by category">
              <button
                type="button"
                className="chip"
                aria-pressed={!activeCategory}
                onClick={() => update({ category: "", need: "" })}
              >
                All Categories
              </button>
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="chip"
                  aria-pressed={activeCategory === c}
                  onClick={() => update({ category: c, need: "" })}
                >
                  {c}
                </button>
              ))}
            </div>
          )}

          {/* Results Display */}
          <div className="results" aria-live="polite" aria-busy={state.status === "loading" || searching}>
            {state.status === "loading" && <LoadingList />}

            {state.status === "error" && (
              <StateBox icon="alert" title="We couldn't load resources" tone="error">
                <p>{state.message}</p>
                <Button onClick={retry}>Try again</Button>
              </StateBox>
            )}

            {state.status === "ready" && results.length === 0 && (
              <StateBox icon="search" title={filtered ? "No matches found" : `No ${tabLabel.empty} yet`}>
                <p>
                  {filtered
                    ? "Try a different search word or clear the filters to see all available verified resources."
                    : `Nothing has been listed under ${tabLabel.empty} yet.`}
                </p>
                {filtered && (
                  <Button variant="line" onClick={() => update({ q: "", category: "", location: "", need: "" })}>
                    Clear search and filters
                  </Button>
                )}
              </StateBox>
            )}

            {state.status === "ready" && results.length > 0 && (
              <>
                {hasSample && (
                  <div className="alert alert-info" role="note">
                    <Icon name="alert" size={20} />
                    <span>
                      Some entries below are <strong>sample data for development</strong>, not real resources or
                      facilities.
                    </span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
                  <p className="count" style={{ margin: 0 }}>
                    Showing {results.length} of {state.total} {state.total === 1 ? "resource" : "resources"}
                  </p>
                  {filtered && (
                    <button
                      type="button"
                      className="active-need-clear"
                      onClick={() => update({ q: "", category: "", location: "", need: "" })}
                    >
                      Reset all filters
                    </button>
                  )}
                </div>
                <ul className="result-list">
                  {results.map((r) => (
                    <ResultCard key={r.id} r={r} />
                  ))}
                </ul>
                {state.page < state.pages && (
                  <div className="more">
                    {state.moreError && (
                      <p className="field-error" role="alert">
                        We couldn't load more results.
                      </p>
                    )}
                    <Button variant="line" onClick={loadMore} disabled={state.loadingMore}>
                      {state.loadingMore ? "Loading…" : state.moreError ? "Try again" : "Show more"}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <p className="disclaimer">
          SEHAT SAATHI health resources and helplines are provided for informational discovery. They do not replace
          clinical diagnosis or prescription from a registered medical practitioner. In an emergency, always call 108
          or 102 immediately.
        </p>
      </section>
    </>
  );
}

function ClickableContact({ contact }: { contact: string }) {
  // Regex pattern matching phone numbers: 108, 102, 104, 14416, 14567, 1098, 181, 1097, 14555, 1800-xxx-xxxx, 0xx-xxxxxxxx
  const phonePattern = /(\b1800[- ]?\d{2,3}[- ]?\d{4}\b|\b0\d{2,4}[- ]?\d{6,8}\b|\b\d{10}\b|\b108\b|\b102\b|\b104\b|\b14416\b|\b14567\b|\b1098\b|\b181\b|\b1097\b|\b14555\b)/g;
  const parts = contact.split(phonePattern);

  return (
    <span className="contact-line">
      {parts.map((part, i) => {
        if (phonePattern.test(part)) {
          const rawNum = part.replace(/[^\d+]/g, "");
          return (
            <a key={i} href={`tel:${rawNum}`} className="tel-link" title={`Call ${rawNum}`}>
              <Icon name="phone" size={13} /> {part}
            </a>
          );
        }
        return part;
      })}
    </span>
  );
}

function ResultCard({ r }: { r: Resource }) {
  const href = safeUrl(r.url);
  const verified = r.last_verified_at
    ? new Date(r.last_verified_at).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;
  const meta = [r.provider, r.location, r.language ? r.language.toUpperCase() : null]
    .filter(Boolean)
    .join(" · ");

  // Extract primary phone number for direct quick-call button
  const phoneMatch = r.contact?.match(
    /(\b1800[- ]?\d{2,3}[- ]?\d{4}\b|\b0\d{2,4}[- ]?\d{6,8}\b|\b\d{10}\b|\b108\b|\b102\b|\b104\b|\b14416\b|\b14567\b|\b1098\b|\b181\b|\b1097\b|\b14555\b)/
  );
  const primaryPhone = phoneMatch ? phoneMatch[0].replace(/[^\d+]/g, "") : null;

  return (
    <li className="result card">
      <IconBadge name={r.kind === "care" ? "pin" : "doc"} tone={r.kind === "care" ? "blue" : "teal"} />
      <div>
        <span className="tag">{r.category}</span>
        {r.is_sample && <span className="tag-sample">Sample</span>}
        <h3>{r.title}</h3>
        <p>{r.summary}</p>
        {meta && <p className="meta">{meta}</p>}
        {r.contact && (
          <p className="meta">
            Contact: <ClickableContact contact={r.contact} />
          </p>
        )}
        <p className="meta">
          Source: {r.source}
          {verified ? ` · Last verified ${verified}` : " · Not yet verified"}
        </p>

        <div className="card-actions-row">
          {primaryPhone && (
            <a href={`tel:${primaryPhone}`} className="btn btn-navy btn-sm">
              <Icon name="phone" size={14} /> Call Helpline ({primaryPhone})
            </a>
          )}
          {href && (
            <a className="text-link" href={href} target="_blank" rel="noopener noreferrer">
              Official Portal <Icon name="arrow" size={16} strokeWidth={1.8} />
              <span className="sr-only"> {r.title} (opens in a new tab)</span>
            </a>
          )}
        </div>
      </div>
    </li>
  );
}

function StateBox({
  icon,
  title,
  tone,
  children,
}: {
  icon: "doc" | "search" | "alert";
  title: string;
  tone?: "error";
  children: React.ReactNode;
}) {
  return (
    <div className={`statebox${tone ? " statebox-error" : ""}`} role={tone ? "alert" : undefined}>
      <IconBadge name={icon} tone={tone ? "grey" : "blue"} size="lg" />
      <h3 className="serif">{title}</h3>
      {children}
    </div>
  );
}

function LoadingList() {
  return (
    <ul className="result-list" aria-label="Loading resources">
      {[0, 1, 2].map((i) => (
        <li key={i} className="result card skeleton" aria-hidden="true">
          <span className="sk sk-badge" />
          <div>
            <span className="sk sk-line w40" />
            <span className="sk sk-line w70" />
            <span className="sk sk-line w90" />
          </div>
        </li>
      ))}
    </ul>
  );
}
