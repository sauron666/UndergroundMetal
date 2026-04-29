/**
 * Dispatch a Web Push notification to all of a user's subscriptions.
 * If a subscription returns 404/410 we delete it (it's expired).
 *
 * Payload: { userId: string, title: string, body: string, url?: string }
 */

import { z } from "zod";
import { db } from "@/lib/db";
import { sendWebPush } from "@/server/push/webpush";

const Payload = z.object({
  userId: z.string(),
  title: z.string().min(1).max(80),
  body: z.string().min(1).max(280),
  url: z.string().url().optional(),
  tag: z.string().optional(),
});

export async function sendPush(payload: unknown) {
  const data = Payload.parse(payload);
  const subs = await db.pushSubscription.findMany({
    where: { userId: data.userId },
  });
  if (subs.length === 0) return { delivered: 0 };

  let delivered = 0;
  for (const sub of subs) {
    try {
      await sendWebPush(sub, {
        title: data.title,
        body: data.body,
        url: data.url,
        tag: data.tag,
      });
      await db.pushSubscription.update({
        where: { id: sub.id },
        data: { lastUsedAt: new Date() },
      });
      delivered += 1;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("404") || msg.includes("410")) {
        await db.pushSubscription
          .delete({ where: { id: sub.id } })
          .catch(() => null);
      } else {
        console.error("[push] failed", msg);
      }
    }
  }
  return { delivered };
}
