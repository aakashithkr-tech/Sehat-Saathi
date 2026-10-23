import ClosingCta from "../components/ClosingCta";
import Button from "../components/Button";
import { FeaturePlaceholder } from "../components/FeatureCard";
import { IconBadge, PageHero } from "../components/ui";
import { FEATURES, SHOW_FEATURE_PLACEHOLDERS } from "../data/site";

export default function Features() {
  return (
    <>
      <PageHero
        eyebrow="Key features"
        title="Built around what people actually need."
        lead="Two things working together: information that is easy to understand, and clearer paths to the care and support available."
      />

      <section className="section container">
        <div className="detail-list">
          {FEATURES.map((f, i) => (
            <article key={f.id} id={f.id} className={`detail ${i % 2 ? "detail-blue" : ""}`}>
              <IconBadge name={f.icon} tone={f.tone === "blue" ? "white" : "teal"} size="lg" />
              <div className="detail-body">
                <h2 className="serif">{f.title}</h2>
                <p>{f.detail}</p>
                {f.to && (
                  <Button to={f.to} variant="navy" arrow>
                    Open {f.title.toLowerCase()}
                  </Button>
                )}
              </div>
            </article>
          ))}
          {SHOW_FEATURE_PLACEHOLDERS && <FeaturePlaceholder />}
        </div>
      </section>

      <ClosingCta />
    </>
  );
}
