import { db } from "@/lib/db";
import type { NotificationKind } from "@prisma/client";

/**
 * Per-kind opt-out check. Users can mute a notification class entirely from
 * /account email-prefs. Defaults to enabled — fail-open if a preference row
 * doesn't exist yet (legacy users).
 *
 * COMMENT_REPLY  -> inAppCommentReplies
 * ARTICLE_PUBLISHED -> inAppArticleAlerts
 * SHOW_ANNOUNCED -> inAppShowAlerts
 * MENTION       -> inAppMentions
 * SYSTEM, REPORT_RESOLVED, ARTICLE_VOTE  -> always delivered (transactional)
 */
async function isEnabled(userId: string, kind: NotificationKind): Promise<boolean> {
  if (kind === "SYSTEM" || kind === "REPORT_RESOLVED" || kind === "ARTICLE_VOTE") {
    return true;
  }
  const prefs = await db.emailPreference
    .findUnique({ where: { userId } })
    .catch(() => null);
  if (!prefs) return true;
  switch (kind) {
    case "COMMENT_REPLY":
      return prefs.inAppCommentReplies;
    case "ARTICLE_PUBLISHED":
      return prefs.inAppArticleAlerts;
    case "SHOW_ANNOUNCED":
      return prefs.inAppShowAlerts;
    case "MENTION":
      return prefs.inAppMentions;
    default:
      return true;
  }
}

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
    if (!(await isEnabled(opts.userId, opts.kind))) return null;

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

export async function notifyMany(
  userIds: string[],
  opts: Omit<Parameters<typeof notify>[0], "userId">
) {
  const unique = Array.from(new Set(userIds));
  await Promise.all(unique.map((userId) => notify({ ...opts, userId })));
}
