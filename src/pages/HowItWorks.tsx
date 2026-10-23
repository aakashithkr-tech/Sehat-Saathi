import Button from "../components/Button";
import ClosingCta from "../components/ClosingCta";
import { PageHero } from "../components/ui";
import { STEPS } from "../data/site";

export default function HowItWorks() {
  return (
    <>
      <PageHero
        eyebrow="How it works"
        title="From a question to the right support."
        lead="Three simple steps take you from looking for information to knowing where to turn for care."
      />

      <section className="section container">
        <ol className="timeline">
          {STEPS.map((s) => (
            <li key={s.n} className="timeline-item">
              <span className="serif step-n">{s.n}</span>
              <div>
                <h2>{s.title}</h2>
                <p className="body-lg">{s.long}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="cta-row left mt-48">
          <Button to="/resources" size="lg" arrow>
            Start exploring
          </Button>
          <Button to="/contact" variant="line" size="lg">
            Need help getting started?
          </Button>
        </div>
      </section>

      <ClosingCta />
    </>
  );
}
