import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildIcs } from "@/server/ical";
import { env } from "@/lib/env";

export const runtime = "nodejs";

/**
 * Subscribable band feed. Many calendar apps will refresh this URL daily, so
 * we always return the *future* shows for the band (no auth needed).
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  const { slug } = await ctx.params;
  const band = await db.band.findUnique({ where: { slug } });
  if (!band) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const shows = await db.show.findMany({
    where: {
      date: { gte: new Date() },
      bands: { some: { bandId: band.id } },
    },
    include: { venue: true },
    orderBy: { date: "asc" },
    take: 100,
  });

  const ics = buildIcs(`${band.name} — shows`, shows.map((s) => ({
    uid: `show-${s.id}@undergroundmetal.app`,
    start: s.date,
    summary: s.title,
    location: `${s.venue.name}, ${s.venue.city}, ${s.venue.countryCode}`,
    description: `${env.NEXT_PUBLIC_APP_URL}/concerts/${s.slug}`,
    url: `${env.NEXT_PUBLIC_APP_URL}/concerts/${s.slug}`,
  })));

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="${slug}.ics"`,
      "Cache-Control": "public, max-age=600",
    },
  });
}
