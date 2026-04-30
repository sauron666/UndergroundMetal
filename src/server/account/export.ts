/**
 * GDPR Article 20: Right to data portability.
 *
 * Builds a single JSON document with all data tied to a user's account that
 * the user themselves provided or generated. Read-only — never includes
 * other users' content beyond what they wrote on the requesting user's
 * articles / threads.
 *
 * The shape stays stable so consumers can reason about it; bump
 * `meta.exportVersion` if you change the layout.
 */

import { db } from "@/lib/db";

const EXPORT_VERSION = 1;

export async function buildAccountExport(userId: string) {
  const [
    user,
    emailPrefs,
    follows,
    bookmarks,
    articles,
    comments,
    votes,
    commentVotes,
    forumThreads,
    forumPosts,
    notifications,
    pushSubs,
    affiliate,
    reads,
    releaseRatings,
    reports,
    sessions,
  ] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        bio: true,
        image: true,
        role: true,
        tier: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    db.emailPreference.findUnique({ where: { userId } }),
    db.follow.findMany({
      where: { userId },
      include: { band: { select: { slug: true, name: true } } },
    }),
    db.bookmark.findMany({
      where: { userId },
      include: {
        band: { select: { slug: true, name: true } },
        article: { select: { slug: true, title: true } },
      },
    }),
    db.article.findMany({
      where: { authorId: userId },
      select: {
        id: true,
        slug: true,
        title: true,
        type: true,
        status: true,
        rating: true,
        excerpt: true,
        content: true,
        publishedAt: true,
        createdAt: true,
      },
    }),
    db.comment.findMany({
      where: { userId },
      select: {
        id: true,
        articleId: true,
        parentId: true,
        body: true,
        hidden: true,
        createdAt: true,
      },
    }),
    db.vote.findMany({
      where: { userId },
      select: { articleId: true, value: true },
    }),
    db.commentVote.findMany({
      where: { userId },
      select: { commentId: true, value: true, createdAt: true },
    }),
    db.forumThread.findMany({
      where: { authorId: userId },
      select: {
        id: true,
        slug: true,
        title: true,
        body: true,
        category: true,
        postCount: true,
        createdAt: true,
      },
    }),
    db.forumPost.findMany({
      where: { authorId: userId },
      select: {
        id: true,
        threadId: true,
        body: true,
        hidden: true,
        createdAt: true,
      },
    }),
    db.notification.findMany({
      where: { userId },
      select: {
        kind: true,
        title: true,
        body: true,
        url: true,
        read: true,
        createdAt: true,
      },
    }),
    db.pushSubscription.findMany({
      where: { userId },
      select: { endpoint: true, createdAt: true, lastUsedAt: true },
    }),
    db.affiliateClick.findMany({
      where: { userId },
      select: {
        provider: true,
        url: true,
        referer: true,
        createdAt: true,
      },
    }),
    db.articleRead.findMany({
      where: { userId },
      select: { articleId: true, premium: true, readAt: true },
    }),
    db.releaseRating.findMany({
      where: { userId },
      select: { releaseId: true, value: true, createdAt: true, updatedAt: true },
    }),
    db.report.findMany({
      where: { reporterId: userId },
      select: {
        target: true,
        targetId: true,
        reason: true,
        status: true,
        createdAt: true,
      },
    }),
    db.session.findMany({
      where: { userId },
      select: { sessionToken: false as never, expires: true },
    }),
  ]);

  return {
    meta: {
      exportVersion: EXPORT_VERSION,
      generatedAt: new Date().toISOString(),
      site: "Underground Metal",
    },
    user,
    emailPreferences: emailPrefs,
    follows,
    bookmarks,
    articles,
    comments,
    votes,
    commentVotes,
    forumThreads,
    forumPosts,
    notifications,
    pushSubscriptions: pushSubs,
    affiliateClicks: affiliate,
    articleReads: reads,
    releaseRatings,
    reports,
    sessionsActive: sessions.length,
  };
}
