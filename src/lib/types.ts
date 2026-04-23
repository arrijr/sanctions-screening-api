export type Tier = "free" | "basic" | "pro" | "business";

export const TIER_MONTHLY_LIMITS: Record<Tier, number> = {
  free: 100,
  basic: 2000,
  pro: 20000,
  business: 200000,
};

export const TIER_BATCH_LIMITS: Record<Tier, number> = {
  free: 0,
  basic: 0,
  pro: 10,
  business: 10,
};

export interface MatchResult {
  id: string;
  name: string;
  score: number;
  datasets: string[];
  entity_type: string;
  properties: Record<string, string[]>;
  sanctioned_by: string[];
  first_seen: string | null;
  last_seen: string | null;
}

export interface ScreenResponse {
  matched: boolean;
  entity_type: string;
  query: {
    name: string;
    birth_date?: string;
    nationality?: string;
    country?: string;
  };
  score: number;
  verdict: "strong_match" | "possible_match" | "weak_match" | "no_match";
  matches: MatchResult[];
  datasets_checked: string[];
  screened_at: string;
}
