import type { ReactNode } from "react";
import Icon, { type IconName } from "./Icon";

export function Eyebrow({ children, light }: { children: ReactNode; light?: boolean }) {
  return (
    <p className={`eyebrow${light ? " eyebrow-light" : ""}`}>
      <span className="dot" aria-hidden="true" />
      {children}
    </p>
  );
}

export function IconBadge({
  name,
  tone = "teal",
  size = "md",
}: {
  name: IconName;
  tone?: "teal" | "blue" | "white" | "grey";
  size?: "md" | "lg";
}) {
  return (
    <span className={`badge badge-${tone} badge-${size}`}>
      <Icon name={name} size={size === "lg" ? 26 : 22} strokeWidth={1.6} />
    </span>
  );
}

export function PhotoPlaceholder({
  caption,
  warm,
  className = "",
}: {
  caption: string;
  warm?: boolean;
  className?: string;
}) {
  return (
    <figure className={`ph${warm ? " ph-warm" : ""} ${className}`}>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

export function PageHero({
  eyebrow,
  title,
  lead,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  lead?: string;
  children?: ReactNode;
}) {
  return (
    <section className="page-hero">
      <div className="container">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="serif display rise">{title}</h1>
        {lead && <p className="lead rise d1">{lead}</p>}
        {children}
      </div>
    </section>
  );
}
