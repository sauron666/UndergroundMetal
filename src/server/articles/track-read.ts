/**
 * Per-day deduplicated read tracking. Called from a tiny server action / route
 * when an article page mounts on the client. The fingerprint salts the IP with
 * the calendar day so the same person reading the same article tomorrow
 * registers a fresh read.
 */

import crypto from "node:crypto";
import { db } from "@/lib/db";

export async function trackRead(opts: {
  articleId: string;
  userId: string | null;
  ip: string | null;
  premium: boolean;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const fingerprint = opts.userId
    ? `u:${opts.userId}:${today}`
    : `ip:${crypto
        .createHash("sha256")
        .update(`um:${opts.ip ?? "anon"}:${today}`)
        .digest("hex")
        .slice(0, 24)}`;

  await db.articleRead
    .upsert({
      where: { articleId_fingerprint: { articleId: opts.articleId, fingerprint } },
      create: {
        articleId: opts.articleId,
        userId: opts.userId,
        fingerprint,
        premium: opts.premium,
      },
      update: {},
    })
    .catch((e) => console.error("[trackRead]", e));
}
