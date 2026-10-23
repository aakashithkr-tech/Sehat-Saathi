import Button from "../components/Button";
import { PageHero } from "../components/ui";

export default function NotFound() {
  return (
    <PageHero
      eyebrow="Page not found"
      title="We couldn't find that page."
      lead="The link may be out of date. Head back home or browse the health resources."
    >
      <div className="cta-row left mt-32">
        <Button to="/" size="lg">
          Back to home
        </Button>
        <Button to="/resources" variant="line" size="lg">
          Explore resources
        </Button>
      </div>
    </PageHero>
  );
}
