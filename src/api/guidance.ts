import { apiFetch } from "./client";

export type DurationType = "less_than_24h" | "1_to_3_days" | "4_to_14_days" | "more_than_2_weeks" | "unknown";
export type AgeGroupType = "infant" | "child" | "adult" | "elderly" | "unspecified";

export interface GuidanceIn {
  query?: string | null;
  primary_symptoms?: string[];
  duration?: DurationType;
  age_group?: AgeGroupType;
  is_pregnant?: boolean;
  location_hint?: string | null;
  language?: string;
  allow_ai_synthesis?: boolean;
}

export interface GuidanceTopic {
  id: string;
  title: string;
  summary: string;
  category: string;
  source: string;
  url?: string | null;
  last_verified_at?: string | null;
  is_sample: boolean;
}

export interface GuidanceCare {
  id: string;
  title: string;
  summary: string;
  category: string;
  contact?: string | null;
  location?: string | null;
  url?: string | null;
  source: string;
  is_sample: boolean;
}

export type UrgencyLevel = "emergency" | "seek_consultation" | "self_care_education" | "unclear";

export interface GuidanceOut {
  is_emergency: boolean;
  urgency_level: UrgencyLevel;
  emergency_notice?: string | null;
  has_matching_information: boolean;
  summary: string;
  suggested_actions: string[];
  topics: GuidanceTopic[];
  care_options: GuidanceCare[];
  disclaimer: string;
  ai_generated: boolean;
  ai_status: "opted_out" | "not_configured" | "generated" | "failed";
  contains_sample_data: boolean;
  created_at: string;

  // CarePath Intelligence
  explainable_rationale: string;
  contraindications: string[];
  doctor_summary: string;
  intake_summary: Record<string, unknown>;
}

export function fetchGuidance(payload: GuidanceIn, signal?: AbortSignal): Promise<GuidanceOut> {
  return apiFetch<GuidanceOut>("/api/v1/guidance", {
    method: "POST",
    body: JSON.stringify(payload),
    signal,
  });
}
