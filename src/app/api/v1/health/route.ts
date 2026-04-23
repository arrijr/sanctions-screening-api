import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const upstreamOk = await fetch("https://api.opensanctions.org/healthz", {
    method: "GET",
    signal: AbortSignal.timeout(3000),
  })
    .then((r) => r.ok)
    .catch(() => false);

  return NextResponse.json(
    {
      status: upstreamOk ? "ok" : "degraded",
      upstream_available: upstreamOk,
      timestamp: new Date().toISOString(),
    },
    { status: 200 },
  );
}
