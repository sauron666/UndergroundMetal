/**
 * Site-level analytics for the admin dashboard.
 *
 * All numbers come from existing tables — no separate analytics infra. Most
 * queries are aggregate scans on indexed columns; for higher traffic move to
 * a materialised view or a real analytics product.
 */

import { db } from "@/lib/db";

const DAY = 24 * 60 * 60 * 1000;

export interface AnalyticsSummary {
  generatedAt: string;
  users: { total: number; new7d: number; new30d: number };
  premium: { active: number };
  articles: { published: number; draft: number; inReview: number };
  reads: { total: number; last7d: number; last30d: number; premium7d: number };
  follows: { total: number; new7d: number };
  bookmarks: { total: number };
  comments: { total: number; last7d: number };
  forum: { threads: number; posts: number; new7d: number };
  signupsByDay: { date: string; count: number }[];
  topArticles: {
    id: string;
    slug: string;
    title: string;
    reads: number;
  }[];
  topBands: {
    id: string;
    slug: string;
    name: string;
    follows: number;
  }[];
}

export async function getAnalytics(): Promise<AnalyticsSummary> {
  const now = new Date();
  const since7 = new Date(now.getTime() - 7 * DAY);
  const since30 = new Date(now.getTime() - 30 * DAY);

  const [
    totalUsers,
    new7,
    new30,
    activePremium,
    published,
    draft,
    inReview,
    totalReads,
    reads7,
    reads30,
    premiumReads7,
    totalFollows,
    follows7,
    totalBookmarks,
    totalComments,
    comments7,
    threads,
    posts,
    posts7,
    signupRows,
    topReadsRows,
    topFollowRows,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { createdAt: { gte: since7 } } }),
    db.user.count({ where: { createdAt: { gte: since30 } } }),
    db.user.count({ where: { tier: "PREMIUM" } }),
    db.article.count({ where: { status: "PUBLISHED" } }),
    db.article.count({ where: { status: "DRAFT" } }),
    db.article.count({ where: { status: "IN_REVIEW" } }),
    db.articleRead.count(),
    db.articleRead.count({ where: { readAt: { gte: since7 } } }),
    db.articleRead.count({ where: { readAt: { gte: since30 } } }),
    db.articleRead.count({
      where: { readAt: { gte: since7 }, premium: true },
    }),
    db.follow.count(),
    db.follow.count({ where: { createdAt: { gte: since7 } } }),
    db.bookmark.count(),
    db.comment.count(),
    db.comment.count({ where: { createdAt: { gte: since7 } } }),
    db.forumThread.count(),
    db.forumPost.count(),
    db.forumPost.count({ where: { createdAt: { gte: since7 } } }),
    db.$queryRaw<{ date: string; count: bigint }[]>`
      SELECT to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') AS date,
             COUNT(*) AS count
      FROM "User"
      WHERE "createdAt" >= ${since30}
      GROUP BY date_trunc('day', "createdAt")
      ORDER BY date_trunc('day', "createdAt") ASC
    `,
    db.articleRead.groupBy({
      by: ["articleId"],
      _count: true,
      orderBy: { _count: { articleId: "desc" } },
      take: 10,
    }),
    db.follow.groupBy({
      by: ["bandId"],
      _count: true,
      orderBy: { _count: { bandId: "desc" } },
      take: 10,
    }),
  ]);

  const articleIds = topReadsRows.map((r) => r.articleId);
  const articles = articleIds.length
    ? await db.article.findMany({
        where: { id: { in: articleIds } },
        select: { id: true, slug: true, title: true },
      })
    : [];
  const articlesById = new Map(articles.map((a) => [a.id, a]));

  const bandIds = topFollowRows.map((r) => r.bandId);
  const bands = bandIds.length
    ? await db.band.findMany({
        where: { id: { in: bandIds } },
        select: { id: true, slug: true, name: true },
      })
    : [];
  const bandsById = new Map(bands.map((b) => [b.id, b]));

  return {
    generatedAt: now.toISOString(),
    users: { total: totalUsers, new7d: new7, new30d: new30 },
    premium: { active: activePremium },
    articles: { published, draft, inReview },
    reads: {
      total: totalReads,
      last7d: reads7,
      last30d: reads30,
      premium7d: premiumReads7,
    },
    follows: { total: totalFollows, new7d: follows7 },
    bookmarks: { total: totalBookmarks },
    comments: { total: totalComments, last7d: comments7 },
    forum: { threads, posts, new7d: posts7 },
    signupsByDay: signupRows.map((r) => ({
      date: r.date,
      count: Number(r.count),
    })),
    topArticles: topReadsRows
      .map((r) => {
        const a = articlesById.get(r.articleId);
        if (!a) return null;
        return { ...a, reads: r._count };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null),
    topBands: topFollowRows
      .map((r) => {
        const b = bandsById.get(r.bandId);
        if (!b) return null;
        return { ...b, follows: r._count };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null),
  };
}
