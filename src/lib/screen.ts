import Fuse from "fuse.js";
import type { MatchResult, ScreenResponse } from "./types";

const DATASET_LABELS: Record<string, string> = {
  us_ofac_sdn: "OFAC",
  eu_financial_sanctions: "EU",
  un_sc_sanctions: "UN Security Council",
};

interface SanctionsEntry {
  id: string;
  name: string;
  aliases: string[];
  entity_type: string;
  datasets: string[];
  programs: string[];
  birth_dates: string[];
  nationalities: string[];
  countries: string[];
}

interface SanctionsData {
  generated_at: string;
  total: number;
  entries: SanctionsEntry[];
}

// Lazy-loaded in-memory index — loaded once per serverless instance
let _data: SanctionsData | null = null;
let _fuse: Fuse<SanctionsEntry> | null = null;

function getSanctionsData(): SanctionsData {
  if (!_data) {
    // Dynamic require to avoid bundling issues — file is generated at build time
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _data = require("../data/sanctions.json") as SanctionsData;
  }
  return _data;
}

function getFuse(dataset: string): Fuse<SanctionsEntry> {
  const data = getSanctionsData();
  const entries =
    dataset === "default"
      ? data.entries
      : data.entries.filter((e) => e.datasets.some((d) => datasetFilter(d, dataset)));

  // Rebuild if dataset filter changes (simple cache for "default")
  if (dataset === "default" && _fuse) return _fuse;

  const fuse = new Fuse(entries, {
    keys: [
      { name: "name", weight: 0.7 },
      { name: "aliases", weight: 0.3 },
    ],
    includeScore: true,
    threshold: 0.5, // fuse score 0=perfect, 1=no match — only return scores < 0.5
    ignoreLocation: true,
    minMatchCharLength: 3,
  });

  if (dataset === "default") _fuse = fuse;
  return fuse;
}

function datasetFilter(entryDataset: string, requested: string): boolean {
  if (requested === "sanctions") {
    return ["us_ofac_sdn", "eu_financial_sanctions", "un_sc_sanctions"].includes(entryDataset);
  }
  if (requested === "peps") {
    // No dedicated PEP sources in current dataset — return empty
    return false;
  }
  return true;
}

function fuseScoreToOurScore(fuseScore: number): number {
  // fuse: 0 = perfect, 1 = no match → invert to: 1 = perfect, 0 = no match
  return Math.round((1 - fuseScore) * 100) / 100;
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

export function screenEntity(input: ScreenInput): ScreenResponse {
  const {
    name,
    entity_type = "person",
    birth_date,
    nationality,
    country,
    dataset = "default",
  } = input;

  const fuse = getFuse(dataset);
  const raw = fuse.search(name.trim());

  const matches: MatchResult[] = raw
    .filter((r) => {
      const score = fuseScoreToOurScore(r.score ?? 1);
      if (score < 0.5) return false;
      // Optional: filter by entity_type if provided
      if (entity_type === "company" && r.item.entity_type === "person") return false;
      if (entity_type === "person" && r.item.entity_type === "company") return false;
      return true;
    })
    .map((r) => {
      const item = r.item;
      const score = fuseScoreToOurScore(r.score ?? 1);
      return {
        id: item.id,
        name: item.name,
        score,
        datasets: item.datasets,
        entity_type: item.entity_type,
        properties: {
          ...(item.birth_dates.length ? { birth_date: item.birth_dates } : {}),
          ...(item.nationalities.length ? { nationality: item.nationalities } : {}),
          ...(item.programs.length ? { program: item.programs } : {}),
        },
        sanctioned_by: [...new Set(item.datasets.map((d) => DATASET_LABELS[d] ?? d))],
        first_seen: null,
        last_seen: null,
      };
    })
    .sort((a, b) => b.score - a.score);

  // Narrow by birth_date if provided (post-filter to improve precision)
  const filtered =
    birth_date && matches.length > 1
      ? matches.filter(
          (m) =>
            !m.properties.birth_date ||
            m.properties.birth_date.some((d: string) => d.includes(birth_date.slice(0, 4)))
        )
      : matches;

  const finalMatches = filtered.length ? filtered : matches;
  const topScore = finalMatches[0]?.score ?? 0;

  const query: ScreenResponse["query"] = { name };
  if (birth_date) query.birth_date = birth_date;
  if (nationality) query.nationality = nationality;
  if (country) query.country = country;

  return {
    matched: finalMatches.length > 0,
    entity_type,
    query,
    score: topScore,
    verdict: getVerdict(topScore),
    matches: finalMatches,
    datasets_checked: [dataset],
    screened_at: new Date().toISOString(),
  };
}
