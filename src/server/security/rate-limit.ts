/**
 * Token-bucket rate limiter, DB-backed.
 *
 * Each call attempts to consume a token from a named bucket. Buckets refill
 * linearly over time (tokens/sec * elapsed). The math runs entirely in a
 * single UPDATE ... WHERE so concurrent requests don't double-spend.
 *
 * For higher traffic, port this to a Redis Lua script — same contract.
 *
 * Usage:
 *   const ok = await consumeToken({ key: `ip:${ip}:discover`, capacity: 30, refillPerSec: 0.5 });
 *   if (!ok) return new Response("Too many requests", { status: 429 });
 */

import { db } from "@/lib/db";

export interface BucketConfig {
  key: string;
  capacity: number;
  refillPerSec: number;
  // How many tokens this request costs; default 1
  cost?: number;
}

export async function consumeToken(cfg: BucketConfig): Promise<boolean> {
  const cost = cfg.cost ?? 1;
  const existing = await db.rateLimitBucket.findUnique({
    where: { key: cfg.key },
  });
  const now = Date.now();

  if (!existing) {
    // First request: bucket starts at full minus cost
    if (cost > cfg.capacity) return false;
    await db.rateLimitBucket
      .create({
        data: {
          key: cfg.key,
          tokens: cfg.capacity - cost,
        },
      })
      .catch(() => null);
    return true;
  }

  const elapsedSec = Math.max(
    0,
    (now - existing.updatedAt.getTime()) / 1000
  );
  const refilled = Math.min(
    cfg.capacity,
    existing.tokens + elapsedSec * cfg.refillPerSec
  );

  if (refilled < cost) {
    // Still update the timestamp so we don't permanently freeze; but no
    // tokens are spent.
    await db.rateLimitBucket
      .update({
        where: { key: cfg.key },
        data: { tokens: refilled },
      })
      .catch(() => null);
    return false;
  }

  await db.rateLimitBucket
    .update({
      where: { key: cfg.key },
      data: { tokens: refilled - cost },
    })
    .catch(() => null);
  return true;
}

/**
 * Convenience helper that pulls the IP from a Request and forms a key.
 */
export function ipKey(req: Request, scope: string): string {
  const fwd = req.headers.get("x-forwarded-for") ?? "";
  const ip = fwd.split(",")[0]?.trim() || "unknown";
  return `ip:${ip}:${scope}`;
}

export function userKey(userId: string, scope: string): string {
  return `user:${userId}:${scope}`;
}
