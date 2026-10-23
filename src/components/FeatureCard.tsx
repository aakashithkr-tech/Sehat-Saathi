import { Link } from "react-router-dom";
import type { Feature } from "../data/site";
import Icon from "./Icon";
import { IconBadge } from "./ui";

export function FeatureCard({ feature, className = "" }: { feature: Feature; className?: string }) {
  return (
    <article className={`card feature feature-${feature.tone} ${className}`}>
      <IconBadge name={feature.icon} tone={feature.tone === "blue" ? "white" : "teal"} size="lg" />
      <div>
        <h3 className="serif">{feature.title}</h3>
        <p>{feature.summary}</p>
        {feature.to && (
          <Link to={feature.to} className="text-link">
            Open {feature.title.toLowerCase()} <Icon name="arrow" size={16} strokeWidth={1.8} />
          </Link>
        )}
      </div>
    </article>
  );
}

export function FeaturePlaceholder({ className = "" }: { className?: string }) {
  return (
    <article className={`card feature feature-dashed ${className}`}>
      <IconBadge name="plus" tone="grey" size="lg" />
      <div>
        <h3 className="serif">[Feature name]</h3>
        <p>
          Development placeholder. Add a real feature to <code>FEATURES</code> in{" "}
          <code>src/data/site.ts</code>. Hidden in production builds.
        </p>
      </div>
    </article>
  );
}
