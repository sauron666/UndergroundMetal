import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { buildSitemapIndex } from "@/lib/sitemap-xml";

export const runtime = "nodejs";
export const revalidate = 600;

const PAGE_SIZE = 5_000;

/**
 * Sitemap index. Emits one <sitemap> per section page so we can cap each
 * section file at 5_000 URLs (well below Google's 50_000 limit) and grow
 * past the soft cap by adding pages without changing the index format.
 *
 * Search engines fetch this file, then fetch each per-section file in turn.
 */
export async function GET() {
  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");

  const [bandCount, articleCount, showCount, festivalCount] = await Promise.all([
    db.band.count().catch(() => 0),
    db.article.count({ where: { status: "PUBLISHED" } }).catch(() => 0),
    db.show.count({ where: { date: { gte: new Date() } } }).catch(() => 0),
    db.festival.count().catch(() => 0),
  ]);

  const pagesFor = (n: number) => Math.max(1, Math.ceil(n / PAGE_SIZE));

  const entries = [
    { loc: `${base}/sitemaps/static/1.xml`, lastmod: new Date() },
    ...Array.from({ length: pagesFor(bandCount) }, (_, i) => ({
      loc: `${base}/sitemaps/bands/${i + 1}.xml`,
    })),
    ...Array.from({ length: pagesFor(articleCount) }, (_, i) => ({
      loc: `${base}/sitemaps/articles/${i + 1}.xml`,
    })),
    ...Array.from({ length: pagesFor(showCount) }, (_, i) => ({
      loc: `${base}/sitemaps/concerts/${i + 1}.xml`,
    })),
    ...Array.from({ length: pagesFor(festivalCount) }, (_, i) => ({
      loc: `${base}/sitemaps/festivals/${i + 1}.xml`,
    })),
  ];

  return new NextResponse(buildSitemapIndex(entries), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=600",
    },
  });
}
