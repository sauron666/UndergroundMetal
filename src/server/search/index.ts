/**
 * Full-text search across bands, articles, and shows. Uses Postgres tsvector
 * for ranked relevance, with a pg_trgm name-similarity fallback so typos
 * still find bands.
 *
 * Usage:
 *   const { bands, articles, shows } = await search("svart blkk metal", { limit: 10 });
 */

import { db } from "@/lib/db";

export interface SearchResults {
  bands: BandHit[];
  articles: ArticleHit[];
  shows: ShowHit[];
}

export interface BandHit {
  id: string;
  slug: string;
  name: string;
  countryCode: string | null;
  formedYear: number | null;
  rank: number;
}

export interface ArticleHit {
  id: string;
  slug: string;
  title: string;
  type: string;
  publishedAt: Date | null;
  excerpt: string | null;
  rank: number;
}

export interface ShowHit {
  id: string;
  slug: string;
  title: string;
  date: Date;
  city: string;
  rank: number;
}

function buildTsQuery(input: string): string {
  // Convert "atmospheric black metal" -> "atmospheric & black & metal:*"
  // Each token gets prefix matching. We strip non-alnum to keep tsquery happy.
  return input
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter((t) => t.length > 0)
    .map((t) => `${t}:*`)
    .join(" & ");
}

export async function search(
  query: string,
  opts: { limit?: number } = {}
): Promise<SearchResults> {
  const trimmed = query.trim();
  if (!trimmed) return { bands: [], articles: [], shows: [] };
  const tsq = buildTsQuery(trimmed);
  const limit = Math.min(opts.limit ?? 10, 25);

  // tsvector + trigram fallback (UNION on rank). The trigram branch only
  // contributes for short queries / typos that ts_rank_cd cannot match.
  const bands = await db.$queryRaw<BandHit[]>`
    SELECT id, slug, name, "countryCode", "formedYear",
           GREATEST(
             ts_rank_cd(search_tsv, to_tsquery('simple', ${tsq})),
             similarity(unaccent(name), unaccent(${trimmed}))
           ) AS rank
    FROM "Band"
    WHERE search_tsv @@ to_tsquery('simple', ${tsq})
       OR unaccent(name) % unaccent(${trimmed})
    ORDER BY rank DESC
    LIMIT ${limit};
  `;

  const articles = await db.$queryRaw<ArticleHit[]>`
    SELECT id, slug, title, type::text AS type, "publishedAt", excerpt,
           ts_rank_cd(search_tsv, to_tsquery('english', ${tsq})) AS rank
    FROM "Article"
    WHERE status = 'PUBLISHED'
      AND search_tsv @@ to_tsquery('english', ${tsq})
    ORDER BY rank DESC, "publishedAt" DESC
    LIMIT ${limit};
  `;

  // Shows lack a tsvector for now; do a cheap ILIKE on title + venue city.
  const shows = await db.$queryRaw<ShowHit[]>`
    SELECT s.id, s.slug, s.title, s.date, v.city,
           similarity(unaccent(s.title), unaccent(${trimmed})) AS rank
    FROM "Show" s
    JOIN "Venue" v ON v.id = s."venueId"
    WHERE s.date >= NOW()
      AND (unaccent(s.title) ILIKE unaccent(${"%" + trimmed + "%"})
        OR unaccent(v.city) ILIKE unaccent(${"%" + trimmed + "%"}))
    ORDER BY rank DESC, s.date ASC
    LIMIT ${limit};
  `;

  return { bands, articles, shows };
}
