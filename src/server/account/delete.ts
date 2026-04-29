/**
 * GDPR right-to-erasure: delete a user's account and personal data while
 * preserving the integrity of community contributions (which other users may
 * have replied to or quoted) by anonymising rather than hard-deleting.
 *
 * Deleted: User row, sessions, accounts (OAuth links), push subscriptions,
 * email preferences, bookmarks, follows, votes, comment votes, push
 * subscriptions, notifications, auth tokens, affiliate clicks (set userId null
 * via FK SetNull), email logs (FK SetNull).
 *
 * Anonymised (kept, but no longer linked to a real person):
 *   - Articles authored: re-author to a singleton "deleted-author" account.
 *     The history matters editorially; bylines become "deleted user".
 *   - Comments / forum posts: body kept (other replies depend on context),
 *     but author moved to the deleted-author account and hidden=true.
 *   - Reports filed: reporter moved to deleted-author so editor queue still
 *     resolves cleanly.
 *
 * The deleted-author account is provisioned on first call.
 */

import { db } from "@/lib/db";

const DELETED_EMAIL = "deleted@undergroundmetal.app";
const DELETED_USERNAME = "deleted";

async function getDeletedUser() {
  const existing = await db.user.findUnique({
    where: { email: DELETED_EMAIL },
  });
  if (existing) return existing;
  return db.user.create({
    data: {
      email: DELETED_EMAIL,
      username: DELETED_USERNAME,
      name: "deleted user",
      role: "READER",
    },
  });
}

export interface DeletionResult {
  ok: true;
  reassigned: {
    articles: number;
    comments: number;
    forumThreads: number;
    forumPosts: number;
    reports: number;
  };
}

export async function deleteAccount(userId: string): Promise<DeletionResult> {
  const ghost = await getDeletedUser();
  if (ghost.id === userId) {
    throw new Error("cannot delete the system 'deleted' account");
  }

  const result = await db.$transaction(async (tx) => {
    const reassigned = {
      articles: (
        await tx.article.updateMany({
          where: { authorId: userId },
          data: { authorId: ghost.id },
        })
      ).count,
      comments: (
        await tx.comment.updateMany({
          where: { userId },
          data: { userId: ghost.id, hidden: true },
        })
      ).count,
      forumThreads: (
        await tx.forumThread.updateMany({
          where: { authorId: userId },
          data: { authorId: ghost.id },
        })
      ).count,
      forumPosts: (
        await tx.forumPost.updateMany({
          where: { authorId: userId },
          data: { authorId: ghost.id, hidden: true },
        })
      ).count,
      reports: (
        await tx.report.updateMany({
          where: { reporterId: userId },
          data: { reporterId: ghost.id },
        })
      ).count,
    };

    // Delete personal data (cascades will handle most child rows)
    await tx.user.delete({ where: { id: userId } });

    return reassigned;
  });

  return { ok: true, reassigned: result };
}
