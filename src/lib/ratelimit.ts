import { Ratelimit } from "@upstash/ratelimit";
import { getRedis } from "./redis";
import { TIER_MONTHLY_LIMITS, type Tier } from "./types";

const _limiters = new Map<Tier, Ratelimit>();

function getLimiter(tier: Tier): Ratelimit {
  let limiter = _limiters.get(tier);
  if (!limiter) {
    const limit = TIER_MONTHLY_LIMITS[tier];
    limiter = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(limit, "30 d"),
      analytics: false,
      prefix: `rl:sanctions:${tier}`,
    });
    _limiters.set(tier, limiter);
  }
  return limiter;
}

export function tierFromRequest(headers: Headers): Tier {
  const sub = headers.get("x-rapidapi-subscription")?.toLowerCase();
  if (sub === "business" || sub === "ultra" || sub === "mega") return "business";
  if (sub === "pro") return "pro";
  if (sub === "basic") return "basic";
  return "free";
}

export function userKeyFromRequest(headers: Headers): string {
  return (
    headers.get("x-rapidapi-user") ||
    headers.get("x-rapidapi-subscription") ||
    headers.get("x-forwarded-for") ||
    "anon"
  );
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  limit: number;
  reset: number;
  tier: Tier;
}

export async function checkRateLimit(headers: Headers): Promise<RateLimitResult> {
  const tier = tierFromRequest(headers);
  const user = userKeyFromRequest(headers);
  try {
    const limiter = getLimiter(tier);
    const result = await limiter.limit(user);
    return {
      success: result.success,
      remaining: result.remaining,
      limit: result.limit,
      reset: result.reset,
      tier,
    };
  } catch {
    return {
      success: true,
      remaining: TIER_MONTHLY_LIMITS[tier],
      limit: TIER_MONTHLY_LIMITS[tier],
      reset: 0,
      tier,
    };
  }
}
