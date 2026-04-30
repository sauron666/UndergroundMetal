/**
 * AI year-end best-of generator.
 *
 * Pipeline:
 *   1. Pull every PUBLISHED review/feature article from the target year that
 *      references one or more bands.
 *   2. Aggregate per-band signals: editor rating (when present), comment
 *      count, vote score, follow growth in that year.
 *   3. Hand the corpus to Claude Opus and ask it to return a ranked list of
 *      N bands that defined the year, with a short rationale per pick. The
 *      model picks ONLY from bands referenced in the corpus — we never let
 *      it hallucinate names.
 *   4. Persist as a draft BandList(kind=BEST_OF, year=Y, published=false)
 *      ready for an editor to review and publish.
 */

import { z } from "zod";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";
import { getAnthropic, MODELS } from "./anthropic";

const SYSTEM = `You are the senior editor at an underground metal magazine
compiling the year-end best-of list. Your job is to rank the most important
bands of the given year based ONLY on the editorial corpus you are given —
the reviews, features and interviews this magazine actually published.

Rules:
  1. Pick ONLY from bands that appear in the corpus. Do not invent names.
  2. Bias toward the underground when bands are roughly tied: prefer
     scene-shaking demos to safe major-label releases.
  3. Each pick gets a 1-3 sentence rationale grounded in the corpus signals
     (rating, comment volume, scene impact). Do not fabricate quotes.
  4. Return strict JSON only — no prose.`;

const Item = z.object({
  bandName: z.string(),
  rationale: z.string(),
});

const ResponseSchema = z.object({
  intro: z.string(),
  picks: z.array(Item),
});

interface BandSignals {
  bandId: string;
  bandName: string;
  bandSlug: string;
  countryCode: string | null;
  undergroundScore: number;
  heaviness: number;
  articleCount: number;
  averageRating: number | null;
  totalVotes: number;
  totalComments: number;
  followsInYear: number;
}

async function gatherSignals(year: number): Promise<BandSignals[]> {
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const yearEnd = new Date(Date.UTC(year + 1, 0, 1));

  // Articles published this year that tag bands
  const articleBands = await db.articleBand.findMany({
    where: {
      article: {
        status: "PUBLISHED",
        publishedAt: { gte: yearStart, lt: yearEnd },
      },
    },
    include: {
      article: {
        select: {
          id: true,
          rating: true,
          _count: { select: { votes: true, comments: true } },
        },
      },
      band: {
        select: {
          id: true,
          name: true,
          slug: true,
          countryCode: true,
          undergroundScore: true,
          heaviness: true,
        },
      },
    },
  });

  if (articleBands.length === 0) return [];

  // Aggregate per band
  const acc = new Map<
    string,
    {
      band: BandSignals["bandId"] extends infer _ ? BandSignals : never;
      ratingSum: number;
      ratingCount: number;
    }
  >();

  type Acc = {
    bandId: string;
    bandName: string;
    bandSlug: string;
    countryCode: string | null;
    undergroundScore: number;
    heaviness: number;
    articleCount: number;
    ratingSum: number;
    ratingCount: number;
    totalVotes: number;
    totalComments: number;
  };
  const map = new Map<string, Acc>();

  for (const ab of articleBands) {
    const existing = map.get(ab.bandId);
    if (existing) {
      existing.articleCount += 1;
      if (ab.article.rating != null) {
        existing.ratingSum += ab.article.rating;
        existing.ratingCount += 1;
      }
      existing.totalVotes += ab.article._count.votes;
      existing.totalComments += ab.article._count.comments;
    } else {
      map.set(ab.bandId, {
        bandId: ab.bandId,
        bandName: ab.band.name,
        bandSlug: ab.band.slug,
        countryCode: ab.band.countryCode,
        undergroundScore: ab.band.undergroundScore,
        heaviness: ab.band.heaviness,
        articleCount: 1,
        ratingSum: ab.article.rating ?? 0,
        ratingCount: ab.article.rating != null ? 1 : 0,
        totalVotes: ab.article._count.votes,
        totalComments: ab.article._count.comments,
      });
    }
  }

  // Follows accrued in year
  const bandIds = Array.from(map.keys());
  const followsRows =
    bandIds.length > 0
      ? await db.follow.groupBy({
          by: ["bandId"],
          where: {
            bandId: { in: bandIds },
            createdAt: { gte: yearStart, lt: yearEnd },
          },
          _count: true,
        })
      : [];
  const followsMap = new Map(followsRows.map((r) => [r.bandId, r._count]));

  return Array.from(map.values()).map((a) => ({
    bandId: a.bandId,
    bandName: a.bandName,
    bandSlug: a.bandSlug,
    countryCode: a.countryCode,
    undergroundScore: a.undergroundScore,
    heaviness: a.heaviness,
    articleCount: a.articleCount,
    averageRating:
      a.ratingCount > 0 ? Math.round(a.ratingSum / a.ratingCount) : null,
    totalVotes: a.totalVotes,
    totalComments: a.totalComments,
    followsInYear: followsMap.get(a.bandId) ?? 0,
  }));
}

function buildPrompt(
  year: number,
  signals: BandSignals[],
  limit: number
): string {
  const corpus = signals
    .map(
      (s) =>
        `- ${s.bandName} [${s.countryCode ?? "—"}]: ${s.articleCount} article(s), ` +
        `${s.averageRating != null ? `avg rating ${s.averageRating}/100, ` : ""}` +
        `votes ${s.totalVotes}, comments ${s.totalComments}, ` +
        `new follows ${s.followsInYear}, underground ${s.undergroundScore}/10`
    )
    .join("\n");

  return [
    `Year: ${year}`,
    `Limit: ${limit} picks`,
    "",
    "CORPUS (bands referenced in our editorial coverage this year):",
    corpus,
    "",
    "Return JSON of shape:",
    JSON.stringify(
      {
        intro: "1-2 sentence framing of the year's editorial throughline",
        picks: [{ bandName: "...", rationale: "..." }],
      },
      null,
      2
    ),
  ].join("\n");
}

function extractJson(raw: string): unknown {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : raw;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("Best-of: model did not return JSON");
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

export interface BestOfResult {
  listId: string;
  slug: string;
  picks: number;
}

export async function generateBestOf(opts: {
  year: number;
  curatorId: string;
  limit?: number;
}): Promise<BestOfResult> {
  const { year, curatorId } = opts;
  const limit = Math.min(opts.limit ?? 25, 50);

  const signals = await gatherSignals(year);
  if (signals.length === 0) {
    throw new Error(
      `No published articles tag any bands in ${year}; cannot generate best-of.`
    );
  }

  const client = getAnthropic();
  const message = await client.messages.create({
    model: MODELS.discovery,
    max_tokens: 4096,
    system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: buildPrompt(year, signals, limit) }],
  });
  const text = message.content
    .map((c) => (c.type === "text" ? c.text : ""))
    .join("\n");
  const parsed = ResponseSchema.parse(extractJson(text));

  // Map AI band names to local Band rows. We only keep picks that match our
  // corpus exactly, by name (case-insensitive). This is the "no hallucination"
  // hard guarantee.
  const corpusByName = new Map(
    signals.map((s) => [s.bandName.toLowerCase(), s])
  );
  const matched = parsed.picks
    .map((p) => ({ band: corpusByName.get(p.bandName.toLowerCase()), pick: p }))
    .filter(
      (m): m is { band: BandSignals; pick: z.infer<typeof Item> } => !!m.band
    )
    .slice(0, limit);

  // Persist as draft BandList
  const baseSlug = `best-of-${year}`;
  let slug = baseSlug;
  let n = 1;
  while (await db.bandList.findUnique({ where: { slug } })) {
    n += 1;
    slug = `${baseSlug}-${n}`;
    if (n > 50) break;
  }

  const list = await db.bandList.create({
    data: {
      slug,
      title: `Best of ${year}`,
      description: parsed.intro,
      kind: "BEST_OF",
      year,
      curatorId,
      published: false,
      items: {
        create: matched.map((m, i) => ({
          bandId: m.band.bandId,
          position: i,
          note: m.pick.rationale,
        })),
      },
    },
  });

  return { listId: list.id, slug: list.slug, picks: matched.length };
}
