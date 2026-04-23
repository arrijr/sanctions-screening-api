import type { MatchResult, ScreenResponse } from "./types";

const DATASET_LABELS: Record<string, string> = {
  us_ofac_sdn: "OFAC",
  eu_financial_sanctions: "EU",
  un_sc_sanctions: "UN Security Council",
  gb_hmt_sanctions: "UK OFSI",
  interpol_red_notices: "Interpol",
  us_fbi_most_wanted: "FBI",
  worldbank_debarred: "World Bank",
};

function mapDatasetsToLabels(datasets: string[]): string[] {
  return [...new Set(datasets.map((d) => DATASET_LABELS[d] ?? d))];
}

function getVerdict(score: number): ScreenResponse["verdict"] {
  if (score >= 0.9) return "strong_match";
  if (score >= 0.7) return "possible_match";
  if (score >= 0.5) return "weak_match";
  return "no_match";
}

export interface ScreenInput {
  name: string;
  entity_type?: string;
  birth_date?: string;
  nationality?: string;
  country?: string;
  dataset?: string;
}

export async function screenEntity(input: ScreenInput): Promise<ScreenResponse> {
  const {
    name,
    entity_type = "person",
    birth_date,
    nationality,
    country,
    dataset = "default",
  } = input;

  const schema = entity_type === "company" ? "Organization" : "Person";
  const properties: Record<string, string[]> = { name: [name.trim()] };
  if (birth_date) properties.birthDate = [birth_date];
  if (nationality) properties.nationality = [nationality.toUpperCase()];
  if (country) properties.country = [country.toUpperCase()];

  const osResponse = await fetch(`https://api.opensanctions.org/match/${dataset}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `ApiKey ${process.env.OPENSANCTIONS_API_KEY}`,
    },
    body: JSON.stringify({ queries: { q1: { schema, properties } } }),
    signal: AbortSignal.timeout(8000),
  });

  if (!osResponse.ok) {
    const err = new Error("upstream_unavailable");
    (err as Error & { status: number }).status = osResponse.status;
    throw err;
  }

  const osData = await osResponse.json();
  const results: any[] = osData.responses?.q1?.results ?? [];

  const matches: MatchResult[] = results
    .filter((r) => r.score >= 0.5)
    .map((r) => ({
      id: r.id,
      name: r.caption,
      score: Math.round(r.score * 100) / 100,
      datasets: r.datasets ?? [],
      entity_type: r.schema?.toLowerCase() ?? entity_type,
      properties: r.properties ?? {},
      sanctioned_by: mapDatasetsToLabels(r.datasets ?? []),
      first_seen: r.first_seen ?? null,
      last_seen: r.last_seen ?? null,
    }))
    .sort((a, b) => b.score - a.score);

  const topScore = matches[0]?.score ?? 0;
  const query: ScreenResponse["query"] = { name };
  if (birth_date) query.birth_date = birth_date;
  if (nationality) query.nationality = nationality;
  if (country) query.country = country;

  return {
    matched: matches.length > 0,
    entity_type,
    query,
    score: topScore,
    verdict: getVerdict(topScore),
    matches,
    datasets_checked: [dataset],
    screened_at: new Date().toISOString(),
  };
}
