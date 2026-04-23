/**
 * Fetches OFAC SDN, EU Consolidated Sanctions, and UN Security Council lists
 * and normalizes them to src/data/sanctions.json.
 *
 * Run: node scripts/fetch-sanctions-data.mjs
 * Re-run whenever data needs refreshing (recommended: weekly).
 */

import { XMLParser } from "fast-xml-parser";
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_FILE = join(__dirname, "../src/data/sanctions.json");

mkdirSync(join(__dirname, "../src/data"), { recursive: true });

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  isArray: (name) =>
    [
      "sdnEntry", "aka", "program", "dateOfBirthItem", "placeOfBirthItem",
      "citizenship", "nationality", "sanctionEntity", "nameAlias", "birthdate",
      "regulation", "INDIVIDUAL", "ENTITY", "INDIVIDUAL_ALIAS", "ENTITY_ALIAS",
      "INDIVIDUAL_DATE_OF_BIRTH", "NATIONALITY",
    ].includes(name),
});

async function fetchXml(url, label) {
  console.log(`Fetching ${label}...`);
  const res = await fetch(url, {
    headers: { "User-Agent": "sanctions-screening-api/1.0 (data refresh)" },
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error(`${label}: HTTP ${res.status}`);
  const text = await res.text();
  console.log(`  ${label}: ${(text.length / 1024).toFixed(0)} KB`);
  return text;
}

// ─── OFAC SDN ────────────────────────────────────────────────────────────────

function parseOfac(xml) {
  const data = parser.parse(xml);
  const entries = data?.sdnList?.sdnEntry ?? [];
  const results = [];

  for (const e of entries) {
    const isEntity = e.sdnType === "Entity";
    const firstName = e.firstName ?? "";
    const lastName = e.lastName ?? "";
    const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
    if (!fullName) continue;

    const aliases = [];
    for (const aka of e.akaList?.aka ?? []) {
      const an = [aka.firstName, aka.lastName].filter(Boolean).join(" ").trim();
      if (an && an !== fullName) aliases.push(an);
    }

    const birthDates = (e.dateOfBirthList?.dateOfBirthItem ?? [])
      .map((d) => d.dateOfBirth)
      .filter(Boolean);

    const nationalities = (e.citizenshipList?.citizenship ?? [])
      .map((c) => c.country)
      .filter(Boolean);

    const programs = (e.programList?.program ?? []).filter(Boolean);

    results.push({
      id: `ofac-${e.uid}`,
      name: fullName,
      aliases,
      entity_type: isEntity ? "company" : "person",
      datasets: ["us_ofac_sdn"],
      programs,
      birth_dates: birthDates,
      nationalities,
      countries: [],
    });
  }

  console.log(`  OFAC: ${results.length} entries parsed`);
  return results;
}

// ─── EU Consolidated ─────────────────────────────────────────────────────────

function parseEu(xml) {
  const data = parser.parse(xml);
  const entries = data?.export?.sanctionEntity ?? [];
  const results = [];

  for (const e of entries) {
    const isPerson = e.subjectType?.["@_code"] === "P";
    const nameAliases = e.entity?.nameAlias ?? [];

    // First nameAlias is typically the primary name
    const primary = nameAliases[0];
    if (!primary) continue;

    const fullName = (
      primary["@_wholeName"] ||
      [primary["@_firstName"], primary["@_middleName"], primary["@_lastName"]]
        .filter(Boolean)
        .join(" ")
    ).trim();
    if (!fullName) continue;

    const aliases = nameAliases
      .slice(1)
      .map((a) =>
        (
          a["@_wholeName"] ||
          [a["@_firstName"], a["@_middleName"], a["@_lastName"]]
            .filter(Boolean)
            .join(" ")
        ).trim()
      )
      .filter((n) => n && n !== fullName);

    const birthDates = (e.entity?.birthdate ?? [])
      .map((b) => b["@_birthdate"])
      .filter(Boolean);

    const nationalities = (e.entity?.citizenship ?? [])
      .map((c) => c["@_countryIso2"])
      .filter(Boolean);

    const regulation = e.regulation?.["@_programme"] ?? "";

    results.push({
      id: `eu-${e["@_euReferenceNumber"] ?? fullName.replace(/\s+/g, "-").toLowerCase()}`,
      name: fullName,
      aliases,
      entity_type: isPerson ? "person" : "company",
      datasets: ["eu_financial_sanctions"],
      programs: regulation ? [regulation] : [],
      birth_dates: birthDates,
      nationalities,
      countries: [],
    });
  }

  console.log(`  EU: ${results.length} entries parsed`);
  return results;
}

// ─── UN Security Council ─────────────────────────────────────────────────────

function parseUn(xml) {
  const data = parser.parse(xml);
  const individuals = data?.CONSOLIDATED_LIST?.INDIVIDUALS?.INDIVIDUAL ?? [];
  const entities = data?.CONSOLIDATED_LIST?.ENTITIES?.ENTITY ?? [];
  const results = [];

  for (const e of individuals) {
    const fullName = [e.FIRST_NAME, e.SECOND_NAME, e.THIRD_NAME, e.FOURTH_NAME]
      .filter(Boolean)
      .join(" ")
      .trim();
    if (!fullName) continue;

    const aliases = (e.INDIVIDUAL_ALIAS ?? [])
      .map((a) => a.ALIAS_NAME)
      .filter((n) => n && n !== fullName);

    const birthDates = (e.INDIVIDUAL_DATE_OF_BIRTH ?? [])
      .map((d) => d.DATE ?? d.YEAR)
      .filter(Boolean);

    const nationalities = (e.NATIONALITY ?? [])
      .map((n) => n.VALUE)
      .filter(Boolean);

    results.push({
      id: `un-individual-${e.DATAID}`,
      name: fullName,
      aliases,
      entity_type: "person",
      datasets: ["un_sc_sanctions"],
      programs: ["UN_SC"],
      birth_dates: birthDates,
      nationalities,
      countries: [],
    });
  }

  for (const e of entities) {
    const fullName = [e.FIRST_NAME, e.SECOND_NAME, e.THIRD_NAME]
      .filter(Boolean)
      .join(" ")
      .trim();
    if (!fullName) continue;

    const aliases = (e.ENTITY_ALIAS ?? [])
      .map((a) => a.ALIAS_NAME)
      .filter((n) => n && n !== fullName);

    results.push({
      id: `un-entity-${e.DATAID}`,
      name: fullName,
      aliases,
      entity_type: "company",
      datasets: ["un_sc_sanctions"],
      programs: ["UN_SC"],
      birth_dates: [],
      nationalities: [],
      countries: [],
    });
  }

  console.log(`  UN: ${results.length} entries parsed`);
  return results;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const allEntries = [];
  const errors = [];

  // OFAC SDN
  try {
    const xml = await fetchXml(
      "https://www.treasury.gov/ofac/downloads/sdn.xml",
      "OFAC SDN"
    );
    allEntries.push(...parseOfac(xml));
  } catch (e) {
    console.error(`  OFAC failed: ${e.message}`);
    errors.push("ofac");
  }

  // EU Consolidated Sanctions — try multiple known endpoints
  const euUrls = [
    "https://webgate.ec.europa.eu/fsd/fsf/public/files/xmlFullSanctionsList_1_1/content?token=dG9rZW4tMjAxNw==",
    "https://webgate.ec.europa.eu/fsd/fsf/public/files/xmlFullSanctionsList/content?token=dG9rZW4tMjAxNw==",
  ];
  let euOk = false;
  for (const url of euUrls) {
    try {
      const xml = await fetchXml(url, "EU Consolidated");
      allEntries.push(...parseEu(xml));
      euOk = true;
      break;
    } catch (e) {
      console.error(`  EU URL ${url} failed: ${e.message}`);
    }
  }
  if (!euOk) {
    console.warn("  EU: all endpoints failed — skipping (OFAC + UN still included)");
    errors.push("eu");
  }

  // UN Security Council
  try {
    const xml = await fetchXml(
      "https://scsanctions.un.org/resources/xml/en/consolidated.xml",
      "UN SC"
    );
    allEntries.push(...parseUn(xml));
  } catch (e) {
    console.error(`  UN failed: ${e.message}`);
    errors.push("un");
  }

  if (allEntries.length === 0) {
    console.error("All sources failed. Aborting.");
    process.exit(1);
  }

  // Deduplicate by id
  const seen = new Set();
  const unique = allEntries.filter((e) => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });

  const output = {
    generated_at: new Date().toISOString(),
    total: unique.length,
    sources_failed: errors,
    entries: unique,
  };

  writeFileSync(OUT_FILE, JSON.stringify(output, null, 2));
  console.log(`\nWrote ${unique.length} entries to src/data/sanctions.json`);
  if (errors.length) console.warn(`WARNING: sources failed: ${errors.join(", ")}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
