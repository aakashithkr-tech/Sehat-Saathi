import { useRef } from "react";
import { useSearchParams } from "react-router-dom";
import Icon from "../components/Icon";
import Button from "../components/Button";
import { IconBadge, PageHero } from "../components/ui";
import { useCategories, useResources } from "../hooks/useResources";
import { safeUrl, type Resource, type ResourceKind } from "../api/resources";

const TABS: { id: ResourceKind; label: string; empty: string }[] = [
  { id: "information", label: "Health information", empty: "health information" },
  { id: "care", label: "Care and services", empty: "care and services" },
];

export default function Resources() {
  const [params, setParams] = useSearchParams();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const tab: ResourceKind = params.get("tab") === "care" ? "care" : "information";
  const q = params.get("q") ?? "";
  const category = params.get("category") ?? "";

  const update = (next: Record<string, string>) => {
    const p = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    setParams(p, { replace: true });
  };

  const categories = useCategories(tab).map((c) => c.name);
  const activeCategory = category;
  const { state, retry, loadMore, searching } = useResources(tab, q, category);
  const results = state.status === "ready" ? state.items : [];
  const hasSample = results.some((r) => r.is_sample);

  const filtered = Boolean(q.trim() || activeCategory);
  const tabLabel = TABS.find((t) => t.id === tab)!;

  const onTabKey = (e: React.KeyboardEvent, i: number) => {
    let n = i;
    if (e.key === "ArrowRight") n = (i + 1) % TABS.length;
    else if (e.key === "ArrowLeft") n = (i - 1 + TABS.length) % TABS.length;
    else if (e.key === "Home") n = 0;
    else if (e.key === "End") n = TABS.length - 1;
    else return;
    e.preventDefault();
    update({ tab: TABS[n].id, category: "" });
    tabRefs.current[n]?.focus();
  };

  return (
    <>
      <PageHero
        eyebrow="Health resources"
        title={
          <>
            What are you <em>looking for?</em>
          </>
        }
        lead="Search health resources and ways to reach care."
      />

      <section className="section container tight">
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
              onClick={() => update({ tab: t.id, category: "" })}
              onKeyDown={(e) => onTabKey(e, i)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div id="resource-panel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
          <form className="searchbar" role="search" onSubmit={(e) => e.preventDefault()}>
            <label htmlFor="q" className="sr-only">
              Search {tabLabel.empty}
            </label>
            <Icon name="search" size={20} strokeWidth={1.8} />
            <input
              id="q"
              type="search"
              value={q}
              placeholder="Search a topic or service"
              autoComplete="off"
              onChange={(e) => update({ q: e.target.value })}
            />
            {q && (
              <button type="button" className="clear" onClick={() => update({ q: "" })}>
                Clear
              </button>
            )}
          </form>

          {categories.length > 0 && (
            <div className="chips" role="group" aria-label="Filter by category">
              <button
                type="button"
                className="chip"
                aria-pressed={!activeCategory}
                onClick={() => update({ category: "" })}
              >
                All
              </button>
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="chip"
                  aria-pressed={activeCategory === c}
                  onClick={() => update({ category: c })}
                >
                  {c}
                </button>
              ))}
            </div>
          )}

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
                    ? "Try a different word, or clear the filters to see everything."
                    : `Nothing has been listed under ${tabLabel.empty} yet.`}
                </p>
                {filtered && (
                  <Button variant="line" onClick={() => update({ q: "", category: "" })}>
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
                <p className="count">
                  Showing {results.length} of {state.total} {state.total === 1 ? "result" : "results"}
                </p>
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
          Information here does not replace advice from a qualified healthcare professional. A listing does not
          guarantee that a service is currently offered or available, so please contact the provider to confirm
          before you travel.
        </p>
      </section>
    </>
  );
}

function ResultCard({ r }: { r: Resource }) {
  const href = safeUrl(r.url);
  const verified = r.last_verified_at ? new Date(r.last_verified_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : null;
  const meta = [r.provider, r.location, r.language ? r.language.toUpperCase() : null].filter(Boolean).join(" · ");
  return (
    <li className="result card">
      <IconBadge name={r.kind === "care" ? "pin" : "doc"} tone={r.kind === "care" ? "blue" : "teal"} />
      <div>
        <span className="tag">{r.category}</span>
        {r.is_sample && <span className="tag-sample">Sample</span>}
        <h3>{r.title}</h3>
        <p>{r.summary}</p>
        {meta && <p className="meta">{meta}</p>}
        {r.contact && <p className="meta">Contact: {r.contact}</p>}
        <p className="meta">
          Source: {r.source}
          {verified ? ` · Last verified ${verified}` : " · Not yet verified"}
        </p>
        {href && (
          <a className="text-link" href={href} target="_blank" rel="noopener noreferrer">
            Open <Icon name="arrow" size={16} strokeWidth={1.8} />
            <span className="sr-only"> {r.title} (opens in a new tab)</span>
          </a>
        )}
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
