import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Public band autocomplete. No auth required — same data the public /bands
 * page exposes via search. Capped at 12 results, tight rate via Vercel limits.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ bands: [] });
  }
  const bands = await db.band
    .findMany({
      where: { name: { contains: q, mode: "insensitive" } },
      select: { id: true, slug: true, name: true },
      orderBy: { name: "asc" },
      take: 12,
    })
    .catch(() => []);
  return NextResponse.json({ bands });
}
