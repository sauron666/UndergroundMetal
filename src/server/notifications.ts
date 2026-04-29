import { db } from "@/lib/db";
import type { NotificationKind } from "@prisma/client";

/**
 * Create an in-app notification. Idempotent on (userId, refKey) when refKey is
 * provided, so the same event firing twice (e.g. via webhook retry) won't
 * duplicate. We never raise; failures are logged because notifications are
 * never on the hot path of a critical action.
 */
export async function notify(opts: {
  userId: string;
  kind: NotificationKind;
  title: string;
  body?: string;
  url?: string;
  refKey?: string;
}) {
  try {
    if (opts.refKey) {
      const existing = await db.notification.findFirst({
        where: { userId: opts.userId, refKey: opts.refKey },
        select: { id: true },
      });
      if (existing) return existing;
    }
    return await db.notification.create({
      data: {
        userId: opts.userId,
        kind: opts.kind,
        title: opts.title,
        body: opts.body,
        url: opts.url,
        refKey: opts.refKey,
      },
    });
  } catch (e) {
    console.error("[notify] failed", e);
    return null;
  }
}

/**
 * Notify several users in parallel, deduped server-side.
 */
export async function notifyMany(
  userIds: string[],
  opts: Omit<Parameters<typeof notify>[0], "userId">
) {
  const unique = Array.from(new Set(userIds));
  await Promise.all(unique.map((userId) => notify({ ...opts, userId })));
}
