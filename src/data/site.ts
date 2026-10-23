import type { IconName } from "../components/Icon";

export const NAV_LINKS = [
  { to: "/about", label: "About" },
  { to: "/features", label: "Features" },
  { to: "/how-it-works", label: "How it works" },
  { to: "/guidance", label: "Guidance" },
  { to: "/resources", label: "Resources" },
  { to: "/contact", label: "Contact" },
] as const;

export interface Feature {
  id: string;
  title: string;
  summary: string;
  detail: string;
  icon: IconName;
  tone: "teal" | "blue";
  to?: string;
}

/**
 * Real platform features. Only features supported by the project belong here.
 * Add an entry to show it on the Home and Features pages automatically.
 */
export const FEATURES: Feature[] = [
  {
    id: "health-guidance",
    title: "Health guidance",
    summary: "Symptom guidance & clinical emergency screening.",
    detail:
      "Interactive symptom guidance with automated red-flag safety screening, non-diagnostic next steps, and verified care directory linkage.",
    icon: "shield",
    tone: "teal",
    to: "/guidance",
  },
  {
    id: "health-resources",
    title: "Health resources",
    summary: "Browse health information in one place.",
    detail:
      "Health information written to be understood, gathered in one place so it is easier to find and easier to trust.",
    icon: "doc",
    tone: "teal",
    to: "/resources?tab=information",
  },
  {
    id: "access-to-care",
    title: "Access to care",
    summary: "Find your way to services and support.",
    detail:
      "Clearer paths from knowing what to do to knowing where to go, so help is easier to reach.",
    icon: "pin",
    tone: "blue",
    to: "/resources?tab=care",
  },
];


/** Show dashed "add a feature" cards while developing. Hidden in production builds. */
export const SHOW_FEATURE_PLACEHOLDERS = import.meta.env.DEV;

export const PROBLEMS: { icon: IconName; title: string; text: string }[] = [
  { icon: "search", title: "Hard to find", text: "Useful health information is scattered across many sources." },
  { icon: "shield", title: "Hard to trust", text: "It is not always clear which guidance is reliable." },
  { icon: "pin", title: "Hard to reach", text: "Knowing what to do is not the same as knowing where to go." },
];

export const STEPS = [
  {
    n: "01",
    title: "Explore",
    text: "Browse health resources and find what is relevant to you.",
    long: "Start from the resources page. Search by topic or service, or narrow things down with categories.",
  },
  {
    n: "02",
    title: "Understand",
    text: "Read clear, plainly written health information.",
    long: "Open a resource to read it in your own time. Information is written to be understood, not to overwhelm.",
  },
  {
    n: "03",
    title: "Reach care",
    text: "Find the services and support available to you.",
    long: "Switch to care and services to see where help is available, then follow the link or get in touch.",
  },
] as const;

/**
 * Impact figures. Left empty on purpose: add only real, verifiable numbers.
 * The Impact section stays hidden until at least one entry exists.
 */
export const STATS: { value: string; label: string }[] = [];
