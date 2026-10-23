import { Link } from "react-router-dom";
import Button from "../components/Button";
import ClosingCta from "../components/ClosingCta";
import Icon from "../components/Icon";
import { FeatureCard, FeaturePlaceholder } from "../components/FeatureCard";
import { Eyebrow, IconBadge, PhotoPlaceholder } from "../components/ui";
import { FEATURES, PROBLEMS, SHOW_FEATURE_PLACEHOLDERS, STATS, STEPS } from "../data/site";

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="hero">
        <div className="container hero-copy">
          <p className="pill rise">
            <span className="dot" aria-hidden="true" />
            Healthcare information and access platform
          </p>
          <h1 className="serif display rise d1">
            Health information and care, <em>within reach</em>
          </h1>
          <p className="lead rise d2">
            Too many people struggle to find clear, trustworthy health information, or to work out
            where to go for care. Sehat Saathi brings both together, so help is easier to find and
            understand.
          </p>
          <div className="cta-row rise d3">
            <Button to="/facilities" size="lg" arrow>
              Find Healthcare Near Me
            </Button>
            <Button to="/guidance" variant="line" size="lg">
              Get Health Guidance
            </Button>
            <Button to="/resources" variant="line" size="lg">
              Explore Resources
            </Button>
          </div>

        </div>

        <div className="container rise d4">
          <div className="hero-trio">
            <PhotoPlaceholder
              warm
              className="hero-side"
              caption="Photo placeholder: community health worker speaking with a family, natural daylight"
            />
            <HeroPreview />
            <PhotoPlaceholder
              className="hero-side"
              caption="Photo placeholder: neighbours at a community health gathering"
            />
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="band band-white">
        <div className="container">
          <Eyebrow>The problem</Eyebrow>
          <div className="split split-top">
            <h2 className="serif h2">Good health starts with knowing where to turn.</h2>
            <p className="body-lg">
              When health information is hard to find, hard to trust or hard to act on, people delay
              seeking help. Reliable guidance and the way to reach care too often sit in different
              places, or out of reach altogether.
            </p>
          </div>
          <div className="grid-3 mt-56">
            {PROBLEMS.map((p) => (
              <div key={p.title} className="tile">
                <IconBadge name={p.icon} tone="blue" />
                <h3>{p.title}</h3>
                <p>{p.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solution */}
      <section className="solution">
        <div className="container">
          <div className="solution-box">
            <div className="split">
              <div>
                <Eyebrow light>The solution</Eyebrow>
                <h2 className="serif h2">One companion for information and access.</h2>
                <p className="body-lg on-dark">
                  Sehat Saathi is a healthcare information and access platform. It helps people
                  understand their health and find their way to the care and support available to
                  them.
                </p>
                <Button to="/features" variant="white" arrow className="mt-32">
                  See what is inside
                </Button>
              </div>
              <div className="stack">
                <div className="glass">
                  <IconBadge name="doc" tone="teal" size="lg" />
                  <div>
                    <h3>Information</h3>
                    <p>Health resources written to be understood.</p>
                  </div>
                </div>
                <div className="glass">
                  <IconBadge name="pin" tone="blue" size="lg" />
                  <div>
                    <h3>Access</h3>
                    <p>Clearer paths from knowing to getting care.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="section container">
        <Eyebrow>Key features</Eyebrow>
        <h2 className="serif h2 narrow">Built around what people actually need.</h2>
        <div className="bento mt-48">
          {FEATURES.map((f, i) => (
            <FeatureCard key={f.id} feature={f} className={i === 0 ? "b-a" : i === 1 ? "b-b" : i === 2 ? "b-c" : "b-d"} />
          ))}
          {SHOW_FEATURE_PLACEHOLDERS &&
            FEATURES.length < 4 &&
            Array.from({ length: 4 - FEATURES.length }).map((_, i) => (
              <FeaturePlaceholder key={i} className={FEATURES.length + i === 2 ? "b-c" : "b-d"} />
            ))}
        </div>
      </section>

      {/* How it works */}
      <section className="section container">
        <Eyebrow>How it works</Eyebrow>
        <h2 className="serif h2 narrow">From a question to the right support.</h2>
        <ol className="grid-3 steps-list mt-48">
          {STEPS.map((s) => (
            <li key={s.n} className="step">
              <span className="serif step-n">{s.n}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Impact — only rendered when real figures are supplied */}
      {STATS.length > 0 && (
        <section className="section container">
          <Eyebrow>Community impact</Eyebrow>
          <div className="stats">
            {STATS.map((s) => (
              <div key={s.label} className="stat">
                <span className="serif">{s.value}</span>
                <span>{s.label}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <ClosingCta />
    </>
  );
}

function HeroPreview() {
  return (
    <div className="preview">
      <div className="preview-bar" aria-hidden="true">
        <i />
        <i />
        <i />
        <span>Product preview · illustrative</span>
      </div>
      <p className="serif preview-title">What are you looking for?</p>
      <p className="preview-sub">Search health resources and ways to reach care.</p>
      <Link to="/resources" className="preview-search" aria-label="Open health resources search">
        <Icon name="search" size={20} strokeWidth={1.8} />
        <span>Search a topic or service</span>
      </Link>
      <div className="preview-rows">
        <Link to="/facilities" className="preview-row">
          <IconBadge name="hospital" tone="blue" />
          <span>
            <b>Find Healthcare</b>
            <small>Nearby hospitals, PHCs & clinics</small>
          </span>
          <Icon name="arrow" size={18} />
        </Link>
        <Link to="/guidance" className="preview-row">
          <IconBadge name="shield" tone="teal" />
          <span>
            <b>Health guidance</b>
            <small>Symptom check & clinical safety</small>
          </span>
          <Icon name="arrow" size={18} />
        </Link>
        <Link to="/resources?tab=information" className="preview-row">
          <IconBadge name="doc" tone="teal" />
          <span>
            <b>Health resources</b>
            <small>Browse health information</small>
          </span>
          <Icon name="arrow" size={18} />
        </Link>
        <Link to="/resources?need=emergency" className="preview-row">
          <IconBadge name="shield" tone="teal" />
          <span>
            <b>Smart Care Finder</b>
            <small>Match healthcare needs to verified care</small>
          </span>
          <Icon name="arrow" size={18} />
        </Link>
      </div>

    </div>
  );
}
