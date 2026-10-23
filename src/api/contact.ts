import { apiFetch } from "./client";

export interface ContactPayload {
  name: string;
  email: string;
  topic: string;
  message: string;
}

/** Mirrors the backend `ContactOut` schema (POST /api/v1/contact). */
export interface ContactResult {
  id: string;
  duplicate: boolean;
  /** "sent" only when the server's mail provider actually accepted the notification. */
  emailNotification: "sent" | "not_configured" | "failed";
  /** Human-readable, accurate description of what happened, written by the server. */
  detail: string;
}

interface ContactResponse {
  id: string;
  duplicate: boolean;
  email_notification: ContactResult["emailNotification"];
  detail: string;
}

/** Resolves only after the server has confirmed it stored the message. Throws ApiError otherwise. */
export async function submitContact(payload: ContactPayload): Promise<ContactResult> {
  const r = await apiFetch<ContactResponse>("/api/v1/contact", { method: "POST", body: JSON.stringify(payload) });
  return { id: r.id, duplicate: r.duplicate, emailNotification: r.email_notification, detail: r.detail };
}
