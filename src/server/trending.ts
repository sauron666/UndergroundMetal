/**
 * Trending lookups.
 *
 * For bands, "trending" = most new follows in the last N days, plus a tie-breaker
 * on undergroundScore so we surface bands that are *both* getting attention
 * AND actually obscure.
 *
 * For articles, "trending" = (upvotes - downvotes) + comment count, scored
 * with an age decay so a 30-vote article from yesterday outranks a 60-vote
 * article from a month ago.
 */

import { db } from "@/lib/db";

export type Window = "7d" | "30d" | "all";

function sinceFor(window: Window): Date | null {
  const now = Date.now();
  if (window === "7d") return new Date(now - 7 * 24 * 60 * 60 * 1000);
  if (window === "30d") return new Date(now - 30 * 24 * 60 * 60 * 1000);
  return null;
}

export async function trendingBands(window: Window, limit = 12) {
  const since = sinceFor(window);
  const grouped = await db.follow.groupBy({
    by: ["bandId"],
    where: since ? { createdAt: { gte: since } } : {},
    _count: true,
    orderBy: { _count: { bandId: "desc" } },
    take: limit * 2, // overfetch then filter on band data
  });
  if (grouped.length === 0) return [];

  const bands = await db.band.findMany({
    where: { id: { in: grouped.map((g) => g.bandId) } },
    include: { genres: { include: { genre: true } } },
  });
  const byId = new Map(bands.map((b) => [b.id, b]));

  return grouped
    .map((g) => {
      const band = byId.get(g.bandId);
      if (!band) return null;
      // Score: follow count, slight bonus for higher underground score
      const score = g._count + band.undergroundScore * 0.1;
      return { ...band, recentFollows: g._count, score };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export async function trendingArticles(window: Window, limit = 12) {
  const since = sinceFor(window);
  const where = {
    status: "PUBLISHED" as const,
    ...(since ? { publishedAt: { gte: since } } : {}),
  };

  const articles = await db.article.findMany({
    where,
    include: {
      author: { select: { username: true, name: true } },
      _count: { select: { votes: true, comments: true } },
    },
    orderBy: { publishedAt: "desc" },
    take: limit * 4,
  });

  // Aggregate vote signals
  const votesByArticle = await db.vote.groupBy({
    by: ["articleId", "value"],
    where: { articleId: { in: articles.map((a) => a.id) } },
    _count: true,
  });
  const score = new Map<string, number>();
  for (const v of votesByArticle) {
    const sign = v.value === "UP" ? 1 : -1;
    score.set(v.articleId, (score.get(v.articleId) ?? 0) + sign * v._count);
  }

  // Time decay: half-life ~ 7 days
  const now = Date.now();
  const halfLifeMs = 7 * 24 * 60 * 60 * 1000;

  return articles
    .map((a) => {
      const ageMs = now - (a.publishedAt?.getTime() ?? a.createdAt.getTime());
      const decay = Math.pow(0.5, ageMs / halfLifeMs);
      const raw = (score.get(a.id) ?? 0) + a._count.comments * 2;
      return { ...a, trendingScore: raw * decay, score: score.get(a.id) ?? 0 };
    })
    .sort((a, b) => b.trendingScore - a.trendingScore)
    .slice(0, limit);
}
