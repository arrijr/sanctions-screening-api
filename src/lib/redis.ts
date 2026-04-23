import { Redis } from "@upstash/redis";

let _redis: Redis | null = null;

export function getRedis(): Redis {
  if (!_redis) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) {
      throw new Error("Upstash Redis env vars missing");
    }
    _redis = new Redis({ url, token });
  }
  return _redis;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    return (await getRedis().get<T>(key)) ?? null;
  } catch {
    return null;
  }
}

export async function cacheSet<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  try {
    await getRedis().set(key, value, { ex: ttlSeconds });
  } catch {
    /* cache failures are non-fatal */
  }
}
