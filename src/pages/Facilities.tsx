import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Icon from "../components/Icon";
import Button from "../components/Button";
import { IconBadge, PageHero } from "../components/ui";
import { fetchFacilities, type Facility, type FacilityQuery } from "../api/facilities";

const FACILITY_TYPES = [
  { id: "all", label: "All Facilities" },
  { id: "hospital", label: "Hospitals" },
  { id: "phc", label: "Primary Health Centres (PHC)" },
  { id: "clinic", label: "Clinics" },
  { id: "emergency", label: "Emergency & Trauma" },
] as const;

const QUICK_PINS = [
  { pin: "201001", label: "201001 (Ghaziabad)" },
  { pin: "110001", label: "110001 (New Delhi)" },
  { pin: "560001", label: "560001 (Bengaluru)" },
  { pin: "400001", label: "400001 (Mumbai)" },
  { pin: "226001", label: "226001 (Lucknow)" },
];

export default function Facilities() {
  const [params, setParams] = useSearchParams();

  const pincodeParam = params.get("pincode") ?? "";
  const cityParam = params.get("city") ?? "";
  const typeParam = params.get("type") ?? "all";
  const searchParam = params.get("q") ?? "";

  const [pincodeInput, setPincodeInput] = useState(pincodeParam);
  const [cityInput, setCityInput] = useState(cityParam);
  const [searchInput, setSearchInput] = useState(searchParam);
  const [selectedType, setSelectedType] = useState(typeParam);

  const [validationError, setValidationError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [serverMessage, setServerMessage] = useState<string>("");

  const updateUrlParams = (next: { pincode?: string; city?: string; type?: string; q?: string }) => {
    const p = new URLSearchParams(params);
    if (next.pincode !== undefined) {
      if (next.pincode.trim()) p.set("pincode", next.pincode.trim());
      else p.delete("pincode");
    }
    if (next.city !== undefined) {
      if (next.city.trim()) p.set("city", next.city.trim());
      else p.delete("city");
    }
    if (next.type !== undefined) {
      if (next.type && next.type !== "all") p.set("type", next.type);
      else p.delete("type");
    }
    if (next.q !== undefined) {
      if (next.q.trim()) p.set("q", next.q.trim());
      else p.delete("q");
    }
    setParams(p, { replace: true });
  };

  const loadData = async (query: FacilityQuery) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchFacilities(query);
      setFacilities(res.items);
      setTotalCount(res.total);
      setServerMessage(res.message);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unable to reach healthcare facilities directory.";
      setError(msg);
      setFacilities([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPincodeInput(pincodeParam);
    setCityInput(cityParam);
    setSelectedType(typeParam);
    setSearchInput(searchParam);

    loadData({
      pincode: pincodeParam || undefined,
      city: cityParam || undefined,
      facility_type: typeParam !== "all" ? typeParam : undefined,
      search: searchParam || undefined,
    });
  }, [pincodeParam, cityParam, typeParam, searchParam]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = pincodeInput.trim();
    if (cleanPin && (!/^\d{6}$/.test(cleanPin))) {
      setValidationError("Please enter a valid 6-digit Indian PIN code (e.g. 201001).");
      return;
    }
    setValidationError(null);
    updateUrlParams({
      pincode: cleanPin,
      city: cityInput.trim(),
      type: selectedType,
      q: searchInput.trim(),
    });
  };

  const handleQuickPin = (pin: string) => {
    setPincodeInput(pin);
    setValidationError(null);
    updateUrlParams({ pincode: pin });
  };

  const handleTypeSelect = (t: string) => {
    setSelectedType(t);
    updateUrlParams({ type: t });
  };

  const handleClearFilters = () => {
    setPincodeInput("");
    setCityInput("");
    setSelectedType("all");
    setSearchInput("");
    setValidationError(null);
    setParams(new URLSearchParams(), { replace: true });
  };

  const isFiltered = Boolean(pincodeParam || cityParam || (typeParam && typeParam !== "all") || searchParam);

  return (
    <>
      <PageHero
        eyebrow="Healthcare Facilities & Availability"
        title={
          <>
            Find healthcare <em>near you</em>
          </>
        }
        lead="Search nearby hospitals, Primary Health Centres (PHC), clinics, and emergency services by PIN code or city."
      />

      <section className="section container tight">
        {/* Hackathon Demo Notice & Availability Guard */}
        <div className="facility-demo-notice" role="note">
          <div className="notice-icon">
            <Icon name="shield" size={24} />
          </div>
          <div className="notice-content">
            <strong>DEMO DATA — Availability not live-verified:</strong>
            <p>
              Directory listings are indexed for demonstration purposes. Live bed counts, ICU occupancy, and real-time
              doctor attendance are strictly not inferred and require direct on-site or telephone confirmation.
            </p>
          </div>
        </div>

        {/* Search & Filter Card */}
        <div className="facility-search-card">
          <form onSubmit={handleSubmit} className="facility-search-form" noValidate>
            <div className="facility-input-grid">
              <div className={`field ${validationError ? "has-error" : ""}`}>
                <label htmlFor="pincode-input">
                  PIN code <span className="label-hint">(6 digits, e.g. 201001)</span>
                </label>
                <div className="input-with-icon">
                  <Icon name="pin" size={18} />
                  <input
                    id="pincode-input"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    placeholder="e.g. 201001"
                    value={pincodeInput}
                    onChange={(e) => {
                      setPincodeInput(e.target.value);
                      if (validationError) setValidationError(null);
                    }}
                  />
                  {pincodeInput && (
                    <button
                      type="button"
                      className="input-clear-btn"
                      aria-label="Clear PIN code"
                      onClick={() => {
                        setPincodeInput("");
                        if (pincodeParam) updateUrlParams({ pincode: "" });
                      }}
                    >
                      <Icon name="close" size={14} />
                    </button>
                  )}
                </div>
                {validationError && (
                  <p className="field-error" role="alert">
                    {validationError}
                  </p>
                )}
              </div>

              <div className="field">
                <label htmlFor="city-input">
                  City or Region <span className="label-hint">(e.g. Ghaziabad, Delhi)</span>
                </label>
                <div className="input-with-icon">
                  <Icon name="hospital" size={18} />
                  <input
                    id="city-input"
                    type="text"
                    placeholder="e.g. Ghaziabad, Delhi, Bengaluru"
                    value={cityInput}
                    onChange={(e) => setCityInput(e.target.value)}
                  />
                  {cityInput && (
                    <button
                      type="button"
                      className="input-clear-btn"
                      aria-label="Clear city"
                      onClick={() => {
                        setCityInput("");
                        if (cityParam) updateUrlParams({ city: "" });
                      }}
                    >
                      <Icon name="close" size={14} />
                    </button>
                  )}
                </div>
              </div>

              <div className="field">
                <label htmlFor="keyword-search">
                  Keyword / Department <span className="label-hint">(optional)</span>
                </label>
                <div className="input-with-icon">
                  <Icon name="search" size={18} />
                  <input
                    id="keyword-search"
                    type="text"
                    placeholder="e.g. Maternity, Trauma, OPD"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                  />
                  {searchInput && (
                    <button
                      type="button"
                      className="input-clear-btn"
                      aria-label="Clear keyword"
                      onClick={() => {
                        setSearchInput("");
                        if (searchParam) updateUrlParams({ q: "" });
                      }}
                    >
                      <Icon name="close" size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Quick-test PIN Pills */}
            <div className="quick-pins-bar">
              <span className="quick-pins-title">Try Demo PIN:</span>
              <div className="quick-pins-list">
                {QUICK_PINS.map((qp) => (
                  <button
                    key={qp.pin}
                    type="button"
                    className={`quick-pin-pill ${pincodeParam === qp.pin ? "active" : ""}`}
                    onClick={() => handleQuickPin(qp.pin)}
                  >
                    {qp.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Facility Type Filter Tabs */}
            <div className="facility-type-filters" role="group" aria-label="Filter by facility type">
              <span className="filter-label">Facility Type:</span>
              <div className="chips">
                {FACILITY_TYPES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className="chip"
                    aria-pressed={selectedType === t.id}
                    onClick={() => handleTypeSelect(t.id)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="form-action-row">
              <Button type="submit" variant="navy" arrow disabled={loading}>
                {loading ? "Searching Facilities…" : "Search Facilities"}
              </Button>
              {isFiltered && (
                <button type="button" className="btn btn-line" onClick={handleClearFilters}>
                  Reset All Filters
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Results Area */}
        <div className="facility-results-section" aria-live="polite">
          {loading && <FacilityLoadingSkeleton />}

          {error && !loading && (
            <div className="statebox statebox-error" role="alert">
              <IconBadge name="alert" tone="grey" size="lg" />
              <h3 className="serif">Could not load facilities</h3>
              <p>{error}</p>
              <Button onClick={() => loadData({ pincode: pincodeParam, city: cityParam, facility_type: typeParam })}>
                Try again
              </Button>
            </div>
          )}

          {!loading && !error && facilities.length === 0 && (
            <div className="statebox">
              <IconBadge name="search" tone="blue" size="lg" />
              <h3 className="serif">No matching healthcare facilities</h3>
              <p>
                {isFiltered
                  ? serverMessage || "No facilities match your search criteria. Try a different PIN code or city."
                  : "No facilities listed in the directory at this time."}
              </p>
              <div className="cta-row">
                <Button variant="line" onClick={handleClearFilters}>
                  Clear filters & show all
                </Button>
              </div>
            </div>
          )}

          {!loading && !error && facilities.length > 0 && (
            <>
              <div className="facility-results-header">
                <p className="count">
                  {serverMessage || `Showing ${facilities.length} healthcare ${facilities.length === 1 ? "facility" : "facilities"}`}
                </p>
                <span className="results-total-badge">{totalCount} available in directory</span>
              </div>

              <div className="facility-grid">
                {facilities.map((facility) => (
                  <FacilityCard key={facility.id} facility={facility} />
                ))}
              </div>
            </>
          )}
        </div>

        <p className="disclaimer">
          SEHAT SAATHI healthcare facility information is intended for public reference. In an acute medical emergency,
          always call emergency ambulance <strong>108</strong> or <strong>102</strong> immediately or proceed to the
          nearest emergency hospital.
        </p>
      </section>
    </>
  );
}

function FacilityCard({ facility }: { facility: Facility }) {
  const typeMap: Record<string, { label: string; tone: "blue" | "teal" | "grey" }> = {
    hospital: { label: "Hospital", tone: "blue" },
    phc: { label: "Primary Health Centre (PHC)", tone: "teal" },
    clinic: { label: "Clinic", tone: "teal" },
    emergency: { label: "Emergency & Trauma", tone: "blue" },
  };

  const typeInfo = typeMap[facility.facility_type.toLowerCase()] || {
    label: facility.facility_type.toUpperCase(),
    tone: "blue" as const,
  };

  const statusLabel = facility.status_label || (facility.is_sample ? "Demo data" : "Verified information");
  const isDemo = statusLabel.toLowerCase().includes("demo") || facility.is_sample;

  const verifiedDate = facility.last_verified_at
    ? new Date(facility.last_verified_at).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <article className="facility-card card">
      {/* Top Header */}
      <div className="facility-card-header">
        <div className="facility-title-area">
          <div className="facility-badge-row">
            <span className={`facility-type-pill tone-${typeInfo.tone}`}>{typeInfo.label}</span>
            <span className={`facility-status-pill ${isDemo ? "status-demo" : "status-verified"}`}>
              {statusLabel}
            </span>
          </div>
          <h3 className="facility-name">{facility.name}</h3>
        </div>
      </div>

      {/* Address & Direct Map Access */}
      <div className="facility-location-row">
        <Icon name="pin" size={18} />
        <div className="facility-address">
          <span>{facility.address}</span>
          <span className="facility-pin-badge">PIN: {facility.pincode}</span>
        </div>
      </div>

      {/* Contact & Hours Row */}
      <div className="facility-meta-grid">
        {facility.contact && (
          <div className="facility-meta-item">
            <Icon name="phone" size={16} />
            <span className="meta-label">Contact:</span>
            {facility.contact.startsWith("+91") || facility.contact.startsWith("0") ? (
              <a href={`tel:${facility.contact.replace(/[^\d+]/g, "")}`} className="facility-contact-link">
                {facility.contact}
              </a>
            ) : (
              <span className="meta-val">{facility.contact}</span>
            )}
          </div>
        )}

        <div className="facility-meta-item">
          <Icon name="clock" size={16} />
          <span className="meta-label">Hours:</span>
          <span className="meta-val">{facility.opening_hours || "Not verified / Contact facility"}</span>
        </div>
      </div>

      {/* Available Services */}
      {facility.services && facility.services.length > 0 && (
        <div className="facility-services-block">
          <span className="services-title">Available Services & Departments:</span>
          <div className="services-tags">
            {facility.services.map((svc) => (
              <span key={svc} className="service-tag">
                {svc}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Structured Availability Status Panel */}
      <div className="facility-availability-panel">
        <div className="availability-panel-header">
          <Icon name="shield" size={16} />
          <span>Facility Availability & Readiness Status</span>
        </div>

        <div className="availability-grid">
          <div className="availability-cell">
            <span className="cell-label">Directory Status</span>
            <span className="cell-value status-active">
              <Icon name="check" size={14} /> {facility.exists_in_directory ? "Indexed in Directory" : "Unlisted"}
            </span>
          </div>

          <div className="availability-cell">
            <span className="cell-label">Doctor Availability</span>
            <span className="cell-value">{facility.doctor_availability || "Not verified / Contact directly"}</span>
          </div>

          <div className="availability-cell">
            <span className="cell-label">Bed Availability</span>
            <span className="cell-value text-muted">
              {facility.bed_availability || "Not available (Live bed tracking not active)"}
            </span>
          </div>

          <div className="availability-cell">
            <span className="cell-label">Last Verification</span>
            <span className="cell-value text-muted">
              {verifiedDate ? `Verified ${verifiedDate}` : "Not yet verified"}
            </span>
          </div>
        </div>

        <div className="availability-source-note">
          <span>Source: {facility.source}</span>
        </div>
      </div>

      {/* Card Actions */}
      <div className="facility-card-footer">
        {facility.directions_url && (
          <a
            href={facility.directions_url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-navy facility-directions-btn"
          >
            <Icon name="navigation" size={16} />
            <span>Get Directions</span>
            <span className="sr-only">to {facility.name} on Google Maps</span>
          </a>
        )}

        {facility.contact && facility.contact.includes("+91") && (
          <a
            href={`tel:${facility.contact.replace(/[^\d+]/g, "")}`}
            className="btn btn-line facility-call-btn"
          >
            <Icon name="phone" size={16} />
            <span>Call Facility</span>
          </a>
        )}
      </div>
    </article>
  );
}

function FacilityLoadingSkeleton() {
  return (
    <div className="facility-grid" aria-label="Loading facilities">
      {[1, 2, 3].map((i) => (
        <div key={i} className="facility-card card skeleton" aria-hidden="true">
          <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
            <span className="sk sk-line w40" style={{ height: "24px", borderRadius: "999px" }} />
            <span className="sk sk-line w40" style={{ height: "24px", borderRadius: "999px" }} />
          </div>
          <span className="sk sk-line w70" style={{ height: "28px" }} />
          <span className="sk sk-line w90" style={{ height: "18px", marginTop: "12px" }} />
          <span className="sk sk-line w40" style={{ height: "18px", marginTop: "8px" }} />
          <div style={{ height: "80px", background: "#f3f6f8", borderRadius: "14px", marginTop: "18px" }} />
        </div>
      ))}
    </div>
  );
}
