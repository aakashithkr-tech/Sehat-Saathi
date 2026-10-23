import { apiFetch } from "./client";

export type ResourceKind = "information" | "care";

/** Mirrors the backend `ResourceOut` schema. */
export interface Resource {
  id: string;
  kind: ResourceKind;
  title: string;
  summary: string;
  category: string;
  provider?: string | null;
  /** Optional link to the full resource or service. Only http(s) links are ever returned. */
  url?: string | null;
  contact?: string | null;
  language: string;
  location?: string | null;
  source: string;
  /** True for placeholder records that are NOT real, verified resources. */
  is_sample: boolean;
  last_verified_at?: string | null;
}

export interface ResourcePage {
  items: Resource[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface CategoryCount {
  name: string;
  count: number;
}

export interface ResourceQuery {
  kind: ResourceKind;
  search?: string;
  category?: string;
  page?: number;
  pageSize?: number;
}

export function fetchResources(q: ResourceQuery, signal?: AbortSignal): Promise<ResourcePage> {
  const p = new URLSearchParams({ kind: q.kind, page: String(q.page ?? 1), page_size: String(q.pageSize ?? 20) });
  if (q.search?.trim()) p.set("search", q.search.trim());
  if (q.category) p.set("category", q.category);
  return apiFetch<ResourcePage>(`/api/v1/resources?${p}`, { signal });
}

export function fetchCategories(kind: ResourceKind, signal?: AbortSignal): Promise<CategoryCount[]> {
  return apiFetch<CategoryCount[]>(`/api/v1/resources/categories?kind=${kind}`, { signal });
}

/** Defence in depth: the API already filters, but never render a non-http(s) link. */
export function safeUrl(url?: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:" ? u.href : null;
  } catch {
    return null;
  }
}
