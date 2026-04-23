import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/ratelimit";
import { screenEntity } from "@/lib/screen";
import { errorJson, rateLimitedResponse, withRateHeaders } from "@/lib/responses";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_DATASETS = ["default", "sanctions", "peps"];

export async function POST(req: NextRequest) {
  const rl = await checkRateLimit(req.headers);
  if (!rl.success) return rateLimitedResponse(rl);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorJson(400, "Invalid JSON body", "INVALID_JSON", rl);
  }

  const b = body as Record<string, unknown> | null;
  const name = b?.name;
  if (typeof name !== "string" || name.trim().length < 2) {
    return errorJson(400, "Missing required field: name (min 2 characters)", "MISSING_NAME", rl);
  }

  const dataset = (b?.dataset as string | undefined) ?? "default";
  if (!VALID_DATASETS.includes(dataset)) {
    return errorJson(
      400,
      "Invalid dataset. Must be one of: default, sanctions, peps",
      "INVALID_DATASET",
      rl,
    );
  }

  const entity_type = (b?.entity_type as string | undefined) ?? "person";
  if (!["person", "company"].includes(entity_type)) {
    return errorJson(
      400,
      "Invalid entity_type. Must be: person or company",
      "INVALID_ENTITY_TYPE",
      rl,
    );
  }

  try {
    const result = screenEntity({
      name,
      entity_type,
      birth_date: b?.birth_date as string | undefined,
      nationality: b?.nationality as string | undefined,
      country: b?.country as string | undefined,
      dataset,
    });
    const res = NextResponse.json(result, { status: 200 });
    return withRateHeaders(res, rl);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("screen error:", msg);
    return errorJson(500, `Internal server error: ${msg}`, "INTERNAL_ERROR");
  }
}
