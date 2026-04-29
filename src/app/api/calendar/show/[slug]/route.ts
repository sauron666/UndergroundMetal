import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildIcs } from "@/server/ical";
import { env } from "@/lib/env";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  const { slug } = await ctx.params;
  const show = await db.show.findUnique({
    where: { slug },
    include: {
      venue: true,
      bands: { include: { band: true }, orderBy: { position: "asc" } },
    },
  });
  if (!show) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const url = `${env.NEXT_PUBLIC_APP_URL}/concerts/${show.slug}`;
  const lineup = show.bands.map((b) => b.band.name).join(", ");
  const ics = buildIcs(show.title, [
    {
      uid: `show-${show.id}@undergroundmetal.app`,
      start: show.date,
      summary: show.title,
      location: `${show.venue.name}, ${show.venue.city}, ${show.venue.countryCode}`,
      description: `${lineup}\n\n${url}`,
      url,
    },
  ]);

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}.ics"`,
    },
  });
}
