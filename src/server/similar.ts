/**
 * "Similar bands" recommender.
 *
 * Hybrid scoring:
 *   1. Embedding cosine similarity (when both bands have BandEmbedding rows).
 *   2. Genre overlap (Jaccard).
 *   3. Theme overlap (Jaccard).
 *   4. Heaviness + underground-score proximity.
 *   5. Country bonus (small).
 *
 * The embedding contributes when present; otherwise the symbolic features carry
 * the recommendation. This makes the feature work day-1 without waiting for a
 * full embedding backfill.
 */

import { db } from "@/lib/db";

interface ScoredCandidate {
  bandId: string;
  score: number;
  reasons: string[];
}

const W = {
  embedding: 0.45,
  genre: 0.25,
  theme: 0.15,
  heaviness: 0.05,
  underground: 0.05,
  country: 0.05,
};

function jaccard<T>(a: T[], b: T[]): number {
  if (a.length === 0 && b.length === 0) return 0;
  const A = new Set(a);
  const B = new Set(b);
  let inter = 0;
  for (const x of A) if (B.has(x)) inter += 1;
  const union = A.size + B.size - inter;
  return union === 0 ? 0 : inter / union;
}

function cosine(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot; // vectors are normalised
}

export async function findSimilarBands(bandId: string, limit = 8) {
  const target = await db.band.findUnique({
    where: { id: bandId },
    include: { genres: { select: { genreId: true } } },
  });
  if (!target) return [];

  const targetEmbedding = await db.bandEmbedding
    .findUnique({ where: { bandId } })
    .catch(() => null);

  const targetGenreIds = target.genres.map((g) => g.genreId);

  // Pull a manageable candidate set: same genre OR same country, capped.
  const candidates = await db.band.findMany({
    where: {
      id: { not: bandId },
      OR: [
        targetGenreIds.length > 0
          ? { genres: { some: { genreId: { in: targetGenreIds } } } }
          : { id: "_no_match_" },
        target.countryCode ? { countryCode: target.countryCode } : { id: "_no_match_" },
      ],
    },
    include: { genres: { select: { genreId: true } } },
    take: 200,
  });

  if (candidates.length === 0) return [];

  // If we have embeddings, fetch them for the candidate set
  const embeddings = targetEmbedding
    ? await db.bandEmbedding.findMany({
        where: { bandId: { in: candidates.map((c) => c.id) } },
      })
    : [];
  const embMap = new Map(embeddings.map((e) => [e.bandId, e.vector as unknown as number[]]));

  const scored: ScoredCandidate[] = candidates.map((c) => {
    const reasons: string[] = [];
    let score = 0;

    if (targetEmbedding) {
      const v = embMap.get(c.id);
      if (v) {
        const cs = cosine(targetEmbedding.vector as unknown as number[], v);
        score += W.embedding * cs;
        if (cs > 0.7) reasons.push("style");
      }
    }

    const gJ = jaccard(
      targetGenreIds,
      c.genres.map((g) => g.genreId)
    );
    if (gJ > 0) {
      score += W.genre * gJ;
      if (gJ >= 0.5) reasons.push("genre");
    }

    const tJ = jaccard(target.themes, c.themes);
    if (tJ > 0) {
      score += W.theme * tJ;
      if (tJ >= 0.5) reasons.push("themes");
    }

    const hClose = 1 - Math.abs(target.heaviness - c.heaviness) / 10;
    score += W.heaviness * hClose;

    const uClose = 1 - Math.abs(target.undergroundScore - c.undergroundScore) / 10;
    score += W.underground * uClose;

    if (target.countryCode && target.countryCode === c.countryCode) {
      score += W.country;
      reasons.push("scene");
    }

    return { bandId: c.id, score, reasons };
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, limit);

  // Hydrate
  const hydrated = await db.band.findMany({
    where: { id: { in: top.map((s) => s.bandId) } },
    select: {
      id: true,
      slug: true,
      name: true,
      countryCode: true,
      formedYear: true,
      heaviness: true,
      undergroundScore: true,
      genres: { include: { genre: true } },
    },
  });

  const byId = new Map(hydrated.map((h) => [h.id, h]));
  return top
    .map((s) => {
      const band = byId.get(s.bandId);
      if (!band) return null;
      return { ...band, score: s.score, reasons: s.reasons };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
}
