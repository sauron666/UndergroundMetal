import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { buildRss } from "@/lib/rss";

export const runtime = "nodejs";
export const revalidate = 600;

export async function GET() {
  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const articles = await db.article
    .findMany({
      where: { status: "PUBLISHED" },
      include: {
        author: { select: { username: true, name: true } },
        bands: { include: { band: { select: { name: true } } } },
      },
      orderBy: { publishedAt: "desc" },
      take: 50,
    })
    .catch(() => []);

  const xml = buildRss(
    {
      title: "Underground Metal — Articles",
      description:
        "Reviews, interviews, news and features. Sourced and editor-checked.",
      link: `${base}/articles`,
      selfLink: `${base}/feed/articles.xml`,
      updatedAt: articles[0]?.publishedAt ?? undefined,
    },
    articles.map((a) => ({
      title: a.title,
      link: `${base}/articles/${a.slug}`,
      description: a.excerpt ?? a.subtitle ?? undefined,
      pubDate: a.publishedAt ?? a.createdAt,
      guid: `urn:um:article:${a.id}`,
      author: a.author.username ?? a.author.name ?? undefined,
      categories: [
        a.type.toLowerCase(),
        ...a.bands.map((b) => b.band.name),
      ],
    }))
  );

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=600",
    },
  });
}
