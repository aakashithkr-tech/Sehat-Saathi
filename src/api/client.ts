/**
 * Shared API client. The base URL comes from VITE_API_BASE_URL.
 * In `vite dev` it falls back to http://localhost:8000; in a production build there is
 * deliberately no fallback, so a missing value surfaces as an actionable error.
 */
const raw = import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? "http://localhost:8000" : "");
export const API_BASE_URL = raw.trim().replace(/\/+$/, "");
export const apiConfigured = () => API_BASE_URL !== "";

export type ApiErrorKind = "not-configured" | "network" | "validation" | "rate-limited" | "not-found" | "server";

export class ApiError extends Error {
  constructor(
    public kind: ApiErrorKind,
    message: string,
    public status = 0,
    public fields: Record<string, string> = {},
    public retryAfter?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!apiConfigured()) {
    throw new ApiError(
      "not-configured",
      "The app is not connected to its server. Set VITE_API_BASE_URL to the API address and rebuild.",
    );
  }
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: { Accept: "application/json", ...(init.body ? { "Content-Type": "application/json" } : {}), ...init.headers },
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ApiError("network", "We couldn't reach the server. Check your connection and try again.");
  }

  if (res.ok) {
    try {
      return (await res.json()) as T;
    } catch {
      throw new ApiError("server", "The server sent a response we couldn't read.", res.status);
    }
  }

  let body: { detail?: unknown; fields?: Record<string, string> } = {};
  try {
    body = await res.json();
  } catch {
    /* non-JSON error body */
  }
  const detail = typeof body.detail === "string" ? body.detail : undefined;
  if (res.status === 422) return Promise.reject(new ApiError("validation", detail ?? "Some fields need attention.", 422, body.fields ?? {}));
  if (res.status === 429) {
    const ra = Number(res.headers.get("Retry-After"));
    return Promise.reject(new ApiError("rate-limited", detail ?? "Too many requests. Please wait and try again.", 429, {}, Number.isFinite(ra) && ra > 0 ? ra : undefined));
  }
  if (res.status === 404) return Promise.reject(new ApiError("not-found", detail ?? "Not found.", 404));
  return Promise.reject(new ApiError("server", "Something went wrong on our side. Please try again later.", res.status));
}
