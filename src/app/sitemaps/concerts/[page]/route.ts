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

  const rows = await db.show
    .findMany({
      where: { date: { gte: new Date() } },
      select: { slug: true, updatedAt: true },
      orderBy: { date: "asc" },
      skip: (n - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    })
    .catch(() => []);

  const xml = buildUrlset(
    rows.map((s) => ({
      loc: `${base}/concerts/${s.slug}`,
      lastmod: s.updatedAt,
      changefreq: "weekly",
      priority: 0.5,
    }))
  );
  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=600",
    },
  });
}
