import { apiFetch } from "./client";

export type FacilityType = "hospital" | "phc" | "clinic" | "emergency";

export interface Facility {
  id: string;
  name: string;
  facility_type: string;
  address: string;
  pincode: string;
  city: string;
  state: string;
  latitude?: number | null;
  longitude?: number | null;
  contact?: string | null;
  opening_hours?: string | null;
  services: string[];
  status_label: "Verified information" | "Limited information" | "Demo data" | string;
  is_sample: boolean;
  exists_in_directory: boolean;
  doctor_availability: string;
  bed_availability: string;
  source: string;
  last_verified_at?: string | null;
  directions_url: string;
}

export interface FacilityResponse {
  items: Facility[];
  total: number;
  message: string;
  query: {
    pincode?: string | null;
    city?: string | null;
    facility_type?: string | null;
    search?: string | null;
  };
}

export interface FacilityQuery {
  pincode?: string;
  city?: string;
  facility_type?: string;
  search?: string;
}

export function fetchFacilities(q: FacilityQuery = {}, signal?: AbortSignal): Promise<FacilityResponse> {
  const p = new URLSearchParams();
  if (q.pincode?.trim()) p.set("pincode", q.pincode.trim());
  if (q.city?.trim()) p.set("city", q.city.trim());
  if (q.facility_type && q.facility_type !== "all") p.set("facility_type", q.facility_type);
  if (q.search?.trim()) p.set("search", q.search.trim());

  const qs = p.toString();
  return apiFetch<FacilityResponse>(`/api/facilities${qs ? `?${qs}` : ""}`, { signal });
}
