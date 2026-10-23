import Button from "../components/Button";
import ClosingCta from "../components/ClosingCta";
import { Eyebrow, IconBadge, PageHero, PhotoPlaceholder } from "../components/ui";
import { PROBLEMS } from "../data/site";

export default function About() {
  return (
    <>
      <PageHero
        eyebrow="About Sehat Saathi"
        title={
          <>
            Health information and care, <em>within reach</em>
          </>
        }
        lead="Sehat Saathi is a healthcare information and access platform. It exists so that clear, trustworthy health information and the way to reach care are not left to chance."
      />

      <section className="band band-white">
        <div className="container">
          <Eyebrow>Purpose</Eyebrow>
          <div className="split split-top">
            <h2 className="serif h2">Good health starts with knowing where to turn.</h2>
            <p className="body-lg">
              Our purpose is to help people understand their health and find their way to the care
              and support available to them, by bringing information and access into one place.
            </p>
          </div>
        </div>
      </section>

      <section className="section container">
        <Eyebrow>The problem</Eyebrow>
        <h2 className="serif h2 narrow">Three gaps that keep people from help.</h2>
        <p className="body-lg mt-20 measure">
          When health information is hard to find, hard to trust or hard to act on, people delay
          seeking help. Reliable guidance and the way to reach care too often sit in different
          places, or out of reach altogether.
        </p>
        <div className="grid-3 mt-48">
          {PROBLEMS.map((p) => (
            <div key={p.title} className="tile">
              <IconBadge name={p.icon} tone="blue" />
              <h3>{p.title}</h3>
              <p>{p.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="solution">
        <div className="container">
          <div className="solution-box">
            <div className="split">
              <div>
                <Eyebrow light>The proposed solution</Eyebrow>
                <h2 className="serif h2">One companion for information and access.</h2>
                <p className="body-lg on-dark">
                  Sehat Saathi brings health resources and routes to care together, so that knowing
                  what to do and knowing where to go are part of the same journey.
                </p>
                <Button to="/features" variant="white" arrow className="mt-32">
                  See the features
                </Button>
              </div>
              <PhotoPlaceholder
                warm
                className="ph-tall"
                caption="Photo placeholder: a community health conversation, warm natural light"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="section container">
        <div className="note">
          <strong>A note on medical advice.</strong> Sehat Saathi provides health information and
          access support. It does not replace advice from a qualified healthcare professional.
        </div>
      </section>

      <ClosingCta />
    </>
  );
}
