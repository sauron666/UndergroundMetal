import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { buildUrlset } from "@/lib/sitemap-xml";

export const runtime = "nodejs";
export const revalidate = 600;

const PAGE_SIZE = 5_000;

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ page: string }> }
) {
  const { page } = await ctx.params;
  const n = Math.max(1, Number(page));
  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");

  const rows = await db.article
    .findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, publishedAt: true, updatedAt: true },
      orderBy: { id: "asc" },
      skip: (n - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    })
    .catch(() => []);

  const xml = buildUrlset(
    rows.map((a) => ({
      loc: `${base}/articles/${a.slug}`,
      lastmod: a.publishedAt ?? a.updatedAt,
      changefreq: "monthly",
      priority: 0.8,
    }))
  );
  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=600",
    },
  });
}
