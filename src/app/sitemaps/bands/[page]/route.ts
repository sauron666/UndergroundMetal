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

  const bands = await db.band
    .findMany({
      select: { slug: true, updatedAt: true },
      orderBy: { id: "asc" },
      skip: (n - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    })
    .catch(() => []);

  const xml = buildUrlset(
    bands.map((b) => ({
      loc: `${base}/bands/${b.slug}`,
      lastmod: b.updatedAt,
      changefreq: "monthly",
      priority: 0.6,
    }))
  );
  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=600",
    },
  });
}
