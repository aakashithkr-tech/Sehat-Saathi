import { useRef, useState } from "react";
import Button from "../components/Button";
import Icon from "../components/Icon";
import { PageHero } from "../components/ui";
import { submitContact, type ContactPayload, type ContactResult } from "../api/contact";
import { ApiError, apiConfigured } from "../api/client";

type Errors = Partial<Record<keyof ContactPayload, string>>;
type Status = "idle" | "sending" | "sent" | "error";

const TOPICS = ["General question", "Finding health information", "Finding care or services", "Something else"];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(v: ContactPayload): Errors {
  const e: Errors = {};
  if (!v.name.trim()) e.name = "Please enter your name.";
  else if (v.name.trim().length > 120) e.name = "Please use 120 characters or fewer.";
  if (!v.email.trim()) e.email = "Please enter your email address.";
  else if (!EMAIL.test(v.email.trim())) e.email = "Enter a valid email address, like name@example.com.";
  if (!v.topic) e.topic = "Please choose a topic.";
  if (v.message.trim().length < 10) e.message = "Please write at least 10 characters so we can help.";
  else if (v.message.trim().length > 5000) e.message = "Please keep your message under 5,000 characters.";
  return e;
}

export default function Contact() {
  const [values, setValues] = useState<ContactPayload>({ name: "", email: "", topic: "", message: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<ContactResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const inFlight = useRef(false);
  const summaryRef = useRef<HTMLDivElement>(null);
  const first = useRef<HTMLFormElement>(null);

  const set = (k: keyof ContactPayload) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setValues((v) => ({ ...v, [k]: e.target.value }));
    if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inFlight.current) return; // guards against double clicks / Enter-key repeats
    const errs = validate(values);
    setErrors(errs);
    if (Object.keys(errs).length) {
      setStatus("idle");
      focusFirst(errs);
      return;
    }
    inFlight.current = true;
    setStatus("sending");
    setResult(null);
    try {
      const res = await submitContact(values); // success is only shown after the server confirms storage
      setResult(res);
      setStatus("sent");
      setValues({ name: "", email: "", topic: "", message: "" });
    } catch (err) {
      if (err instanceof ApiError && err.kind === "validation" && Object.keys(err.fields).length) {
        const fe: Errors = {};
        for (const [k, msg] of Object.entries(err.fields)) if (k in values) fe[k as keyof ContactPayload] = msg;
        setErrors(fe);
        setStatus("idle");
        focusFirst(fe);
        inFlight.current = false;
        return;
      }
      setErrorMsg(
        err instanceof ApiError
          ? err.kind === "rate-limited" && err.retryAfter
            ? `${err.message} (You can try again in about ${Math.ceil(err.retryAfter / 60)} min.)`
            : err.message
          : "Something went wrong and your message was not sent. Please try again.",
      );
      setStatus("error");
    } finally {
      inFlight.current = false;
    }
    requestAnimationFrame(() => summaryRef.current?.focus());
  };

  const focusFirst = (errs: Errors) =>
    requestAnimationFrame(() => {
      const key = Object.keys(errs).find((k) => errs[k as keyof ContactPayload]);
      if (key) first.current?.querySelector<HTMLElement>(`[name="${key}"]`)?.focus();
    });

  const errorCount = Object.values(errors).filter(Boolean).length;
  const sending = status === "sending";

  return (
    <>
      <PageHero
        eyebrow="Contact and help"
        title={
          <>
            We're here to <em>help.</em>
          </>
        }
        lead="Ask a question or tell us what you were trying to find. Please don't include sensitive medical details."
      />

      <section className="section container tight">
        <div className="contact-grid">
          <form ref={first} className="form" onSubmit={onSubmit} noValidate aria-describedby="form-note">
            {errorCount > 0 && (
              <div className="alert alert-error" role="alert">
                <Icon name="alert" size={20} />
                <span>
                  Please fix {errorCount} {errorCount === 1 ? "field" : "fields"} below.
                </span>
              </div>
            )}

            <Field label="Your name" error={errors.name}>
              <input name="name" maxLength={120} autoComplete="name" value={values.name} onChange={set("name")} aria-invalid={!!errors.name} aria-describedby={errors.name ? "err-name" : undefined} />
            </Field>
            <Field label="Email address" error={errors.email}>
              <input name="email" type="email" maxLength={254} autoComplete="email" value={values.email} onChange={set("email")} aria-invalid={!!errors.email} aria-describedby={errors.email ? "err-email" : undefined} />
            </Field>
            <Field label="Topic" error={errors.topic}>
              <select name="topic" value={values.topic} onChange={set("topic")} aria-invalid={!!errors.topic} aria-describedby={errors.topic ? "err-topic" : undefined}>
                <option value="">Choose a topic</option>
                {TOPICS.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Field>
            <Field label="How can we help?" error={errors.message}>
              <textarea name="message" rows={5} maxLength={5000} value={values.message} onChange={set("message")} aria-invalid={!!errors.message} aria-describedby={errors.message ? "err-message" : undefined} />
            </Field>

            <div ref={summaryRef} tabIndex={-1} className="status" aria-live="polite">
              {status === "sent" && result && (
                <div className="alert alert-ok">
                  <Icon name="check" size={20} />
                  <span>
                    <strong>Thank you.</strong> {result.detail} <span className="ref">Reference: {result.id.slice(0, 8)}</span>
                  </span>
                </div>
              )}
              {status === "error" && (
                <div className="alert alert-error" role="alert">
                  <Icon name="alert" size={20} />
                  <span>
                    <strong>Your message was not sent.</strong> {errorMsg}{" "}
                    {apiConfigured() && (
                      <button type="button" className="inline-retry" onClick={(ev) => onSubmit(ev as unknown as React.FormEvent)}>
                        Try again
                      </button>
                    )}
                  </span>
                </div>
              )}
            </div>

            <p id="form-note" className="form-note">
              {apiConfigured()
                ? "We use your details only to reply to you. Messages are stored privately."
                : "This build isn't connected to its server (VITE_API_BASE_URL is not set), so messages cannot be sent."}
            </p>
            <Button type="submit" size="lg" disabled={sending} aria-busy={sending}>
              {sending ? "Sending…" : "Send message"}
            </Button>
          </form>

          <aside className="help-side">
            <div className="tile">
              <Icon name="mail" size={24} />
              <h3>Before you write</h3>
              <p>You may find what you need faster by browsing the resources or the step-by-step guide.</p>
              <div className="stack-sm">
                <Button to="/resources" variant="line" arrow>
                  Health resources
                </Button>
                <Button to="/how-it-works" variant="line" arrow>
                  How it works
                </Button>
              </div>
            </div>
            <div className="note">
              <strong>In an emergency</strong>, contact your local emergency services or go to the
              nearest hospital. Sehat Saathi is not an emergency service and does not replace advice
              from a qualified healthcare professional.
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactElement<{ name?: string }> }) {
  const name = children.props.name ?? "";
  return (
    <div className={`field${error ? " has-error" : ""}`}>
      <label htmlFor={`f-${name}`}>{label}</label>
      {cloneWithId(children, `f-${name}`)}
      {error && (
        <p id={`err-${name}`} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}

import { cloneElement } from "react";
function cloneWithId(el: React.ReactElement<{ name?: string }>, id: string) {
  return cloneElement(el as React.ReactElement<Record<string, unknown>>, { id });
}
