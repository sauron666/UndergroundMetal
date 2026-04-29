/**
 * Promote an article from IN_REVIEW to PUBLISHED. Side effects:
 *   - set publishedAt
 *   - record an APPROVED ModerationEvent
 *   - enqueue an ARCHIVE_CITATION job per citation (best-effort)
 *   - enqueue SEND_PUSH jobs for users following any of the article's bands
 */

import { db } from "@/lib/db";
import { enqueue } from "@/server/jobs/queue";
import { env } from "@/lib/env";
import { notifyMany } from "@/server/notifications";

export async function publishArticle(articleId: string, editorId: string) {
  const article = await db.article.update({
    where: { id: articleId },
    data: { status: "PUBLISHED", publishedAt: new Date() },
    include: { citations: true, bands: true },
  });

  await db.moderationEvent.create({
    data: {
      articleId: article.id,
      editorId,
      verdict: "APPROVED",
    },
  });

  // Archive citations
  for (const c of article.citations) {
    if (c.archiveUrl) continue;
    await enqueue("ARCHIVE_CITATION", { citationId: c.id }).catch((e) =>
      console.error("[publish] enqueue archive failed", e)
    );
  }

  // Notify followers of bands referenced in the article
  if (article.bands.length > 0) {
    const followers = await db.follow.findMany({
      where: { bandId: { in: article.bands.map((b) => b.bandId) } },
      select: { userId: true },
      distinct: ["userId"],
    });
    const followerIds = followers.map((f) => f.userId);

    // In-app notifications (always)
    await notifyMany(followerIds, {
      kind: "ARTICLE_PUBLISHED",
      title: article.title,
      body: article.excerpt ?? undefined,
      url: `/articles/${article.slug}`,
      refKey: `article-${article.id}`,
    });

    // Web push (only when configured)
    if (env.VAPID_PUBLIC_KEY) {
      for (const userId of followerIds) {
        await enqueue("SEND_PUSH", {
          userId,
          title: "New article",
          body: article.title,
          url: `${env.NEXT_PUBLIC_APP_URL}/articles/${article.slug}`,
          tag: `article-${article.id}`,
        }).catch((e) => console.error("[publish] enqueue push failed", e));
      }
    }
  }

  return article;
}
