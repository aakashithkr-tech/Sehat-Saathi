import Button from "./Button";

export default function ClosingCta() {
  return (
    <section className="closing">
      <div className="container">
        <div className="closing-box">
          <h2 className="serif">
            Your health, <em>better supported.</em>
          </h2>
          <p>Start with the resources, or see how Sehat Saathi works.</p>
          <div className="cta-row">
            <Button to="/resources" size="lg">
              Explore Health Resources
            </Button>
            <Button to="/how-it-works" variant="line" size="lg">
              Learn How It Works
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
