import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, tierFromRequest } from "@/lib/ratelimit";
import { TIER_BATCH_LIMITS } from "@/lib/types";
import { screenEntity, type ScreenInput } from "@/lib/screen";
import { errorJson, rateLimitedResponse, withRateHeaders } from "@/lib/responses";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_DATASETS = ["default", "sanctions", "peps"];

export async function POST(req: NextRequest) {
  const rl = await checkRateLimit(req.headers);
  if (!rl.success) return rateLimitedResponse(rl);

  const tier = tierFromRequest(req.headers);
  const batchLimit = TIER_BATCH_LIMITS[tier];
  if (batchLimit === 0) {
    return errorJson(
      422,
      "Batch screening is not available on your current plan.",
      "BATCH_NOT_AVAILABLE",
      rl,
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorJson(400, "Invalid JSON body", "INVALID_JSON", rl);
  }

  const b = body as Record<string, unknown> | null;
  const entities = b?.entities;
  if (!Array.isArray(entities) || entities.length === 0) {
    return errorJson(400, "Missing required field: entities (non-empty array)", "MISSING_ENTITIES", rl);
  }
  if (entities.length > batchLimit) {
    return errorJson(
      422,
      `Batch size ${entities.length} exceeds your plan limit of ${batchLimit}`,
      "BATCH_LIMIT_EXCEEDED",
      rl,
    );
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

  const inputs: ScreenInput[] = entities.map((e: Record<string, unknown>) => ({
    name: e.name as string,
    entity_type: (e.entity_type as string | undefined) ?? "person",
    birth_date: e.birth_date as string | undefined,
    nationality: e.nationality as string | undefined,
    country: e.country as string | undefined,
    dataset,
  }));

  // Validate all names
  for (let i = 0; i < inputs.length; i++) {
    if (typeof inputs[i].name !== "string" || inputs[i].name.trim().length < 2) {
      return errorJson(
        400,
        `Entity at index ${i} is missing a valid name (min 2 characters)`,
        "MISSING_NAME",
        rl,
      );
    }
  }

  try {
    // Run up to 5 in parallel
    const results = [];
    for (let i = 0; i < inputs.length; i += 5) {
      const batch = inputs.slice(i, i + 5);
      const batchResults = await Promise.all(batch.map((input) => screenEntity(input)));
      results.push(...batchResults);
    }

    const matched_count = results.filter((r) => r.matched).length;
    const res = NextResponse.json(
      {
        results,
        total: results.length,
        matched_count,
        screened_at: new Date().toISOString(),
      },
      { status: 200 },
    );
    return withRateHeaders(res, rl);
  } catch (err) {
    const e = err as Error;
    if (e.message === "upstream_unavailable") {
      return errorJson(503, "Screening service temporarily unavailable.", "SERVICE_UNAVAILABLE");
    }
    return errorJson(500, "Internal server error", "INTERNAL_ERROR");
  }
}
