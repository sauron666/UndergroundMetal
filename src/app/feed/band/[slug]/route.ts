import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { buildRss } from "@/lib/rss";

export const runtime = "nodejs";
export const revalidate = 600;

/**
 * Per-band feed: published articles tagged to this band + upcoming shows.
 * Useful for fans who follow a band via their RSS reader.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  const { slug } = await ctx.params;
  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");

  const band = await db.band.findUnique({ where: { slug } });
  if (!band) {
    return new NextResponse("Not found", { status: 404 });
  }

  const [articles, shows] = await Promise.all([
    db.article.findMany({
      where: {
        status: "PUBLISHED",
        bands: { some: { bandId: band.id } },
      },
      orderBy: { publishedAt: "desc" },
      take: 30,
    }),
    db.show.findMany({
      where: {
        date: { gte: new Date() },
        bands: { some: { bandId: band.id } },
      },
      include: { venue: true },
      orderBy: { date: "asc" },
      take: 30,
    }),
  ]);

  const items = [
    ...articles.map((a) => ({
      title: a.title,
      link: `${base}/articles/${a.slug}`,
      description: a.excerpt ?? undefined,
      pubDate: a.publishedAt ?? a.createdAt,
      guid: `urn:um:article:${a.id}`,
      categories: [a.type.toLowerCase()],
    })),
    ...shows.map((s) => ({
      title: `Live: ${s.title}`,
      link: `${base}/concerts/${s.slug}`,
      description: `${new Date(s.date).toDateString()} · ${s.venue.name}, ${s.venue.city}`,
      pubDate: s.createdAt,
      guid: `urn:um:show:${s.id}`,
      categories: [s.venue.countryCode, "live"],
    })),
  ].sort(
    (a, b) =>
      (b.pubDate ? +new Date(b.pubDate) : 0) -
      (a.pubDate ? +new Date(a.pubDate) : 0)
  );

  const xml = buildRss(
    {
      title: `Underground Metal — ${band.name}`,
      description: `Articles and concerts for ${band.name}.`,
      link: `${base}/bands/${band.slug}`,
      selfLink: `${base}/feed/band/${band.slug}`,
    },
    items
  );

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=600",
    },
  });
}
