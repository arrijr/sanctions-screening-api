import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATASETS_RESPONSE = {
  datasets: [
    {
      id: "default",
      name: "All Sources (Default)",
      description: "All sanctions lists and PEP databases combined",
      entity_count: 75000,
      last_updated: "2026-04-21",
    },
    {
      id: "sanctions",
      name: "Sanctions Only",
      description:
        "OFAC SDN, EU Consolidated, UN Security Council, UK OFSI, and 100+ other sanctions lists",
      entity_count: 55000,
      last_updated: "2026-04-21",
    },
    {
      id: "peps",
      name: "PEPs Only",
      description:
        "Politically Exposed Persons — heads of state, senior officials, their family members",
      entity_count: 20000,
      last_updated: "2026-04-21",
    },
  ],
  data_sources: [
    "OFAC SDN (US)",
    "EU Consolidated Sanctions",
    "UN Security Council",
    "UK OFSI",
    "Interpol Red Notices",
    "FBI Most Wanted",
    "World Bank Debarred",
    "100+ additional sources",
  ],
};

export async function GET() {
  return NextResponse.json(DATASETS_RESPONSE, { status: 200 });
}
