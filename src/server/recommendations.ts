/**
 * "For you" recommendations.
 *
 * Strategy:
 *   1. Take the user's followed bands.
 *   2. For each followed band, fetch top similar bands (using the
 *      similar-bands recommender we already built).
 *   3. Rank by aggregate score, exclude bands the user already follows.
 *   4. Surface upcoming shows for any of the followed-or-recommended bands.
 *
 * If the user follows nothing, we fall back to a curated "starter" selection:
 *   - bands with the highest underground score among recently published reviews
 *   - upcoming shows in the user's preferred country (cookie-based for future,
 *     defaults to all)
 */

import { db } from "@/lib/db";
import { findSimilarBands } from "./similar";

export interface ForYou {
  followedBandIds: string[];
  recommendedBands: Awaited<ReturnType<typeof findSimilarBands>>;
  upcomingShows: Awaited<ReturnType<typeof getUpcomingForBands>>;
}

async function getUpcomingForBands(bandIds: string[], limit = 6) {
  if (bandIds.length === 0) return [];
  return db.show.findMany({
    where: {
      date: { gte: new Date() },
      status: { not: "PAST" },
      bands: { some: { bandId: { in: bandIds } } },
    },
    include: {
      venue: true,
      bands: {
        include: { band: { select: { name: true, slug: true } } },
        orderBy: { position: "asc" },
        take: 3,
      },
    },
    orderBy: { date: "asc" },
    take: limit,
  });
}

export async function getForYou(userId: string | null): Promise<ForYou> {
  if (!userId) {
    // Anonymous fallback: surface recently-published reviews' bands
    const recentArticles = await db.article.findMany({
      where: { status: "PUBLISHED" },
      include: { bands: { include: { band: true } } },
      orderBy: { publishedAt: "desc" },
      take: 12,
    });
    const seenIds = new Set<string>();
    const fallbackBands: Awaited<ReturnType<typeof findSimilarBands>> = [];
    for (const a of recentArticles) {
      for (const b of a.bands) {
        if (seenIds.has(b.bandId)) continue;
        seenIds.add(b.bandId);
        fallbackBands.push({
          ...b.band,
          genres: [],
          score: 0,
          reasons: [],
        });
        if (fallbackBands.length >= 8) break;
      }
      if (fallbackBands.length >= 8) break;
    }
    return {
      followedBandIds: [],
      recommendedBands: fallbackBands,
      upcomingShows: await getUpcomingForBands([...seenIds].slice(0, 30)),
    };
  }

  const follows = await db.follow.findMany({
    where: { userId },
    select: { bandId: true },
  });
  const followedBandIds = follows.map((f) => f.bandId);

  if (followedBandIds.length === 0) {
    return getForYou(null);
  }

  // For each followed band collect candidate similars; aggregate scores
  const aggregate = new Map<string, { score: number; reasons: Set<string>; band: Awaited<ReturnType<typeof findSimilarBands>>[number] }>();
  for (const bandId of followedBandIds.slice(0, 10)) {
    const sims = await findSimilarBands(bandId, 6).catch(() => []);
    for (const s of sims) {
      if (followedBandIds.includes(s.id)) continue;
      const prev = aggregate.get(s.id);
      if (prev) {
        prev.score += s.score;
        for (const r of s.reasons) prev.reasons.add(r);
      } else {
        aggregate.set(s.id, {
          score: s.score,
          reasons: new Set(s.reasons),
          band: s,
        });
      }
    }
  }

  const recommendedBands = Array.from(aggregate.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((a) => ({ ...a.band, score: a.score, reasons: Array.from(a.reasons) }));

  const upcomingShows = await getUpcomingForBands(followedBandIds);

  return { followedBandIds, recommendedBands, upcomingShows };
}
