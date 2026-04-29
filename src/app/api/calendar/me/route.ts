import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { buildIcs } from "@/server/ical";
import { env } from "@/lib/env";

export const runtime = "nodejs";

/**
 * Personal calendar of upcoming shows for every band the user follows.
 * Auth required. Calendar apps that subscribe will need a way to authenticate
 * — a future enhancement is to expose a per-user secret token feed at
 * /api/calendar/feed/<token>.ics.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const follows = await db.follow.findMany({
    where: { userId: session.user.id },
    select: { bandId: true },
  });
  if (follows.length === 0) {
    return new NextResponse(
      buildIcs("Underground Metal — your shows", []),
      {
        headers: {
          "Content-Type": "text/calendar; charset=utf-8",
          "Content-Disposition": `attachment; filename="my-shows.ics"`,
        },
      }
    );
  }

  const shows = await db.show.findMany({
    where: {
      date: { gte: new Date() },
      bands: { some: { bandId: { in: follows.map((f) => f.bandId) } } },
    },
    include: {
      venue: true,
      bands: { include: { band: true }, orderBy: { position: "asc" } },
    },
    orderBy: { date: "asc" },
    take: 200,
  });

  const ics = buildIcs(
    "Underground Metal — your shows",
    shows.map((s) => ({
      uid: `show-${s.id}@undergroundmetal.app`,
      start: s.date,
      summary: s.title,
      location: `${s.venue.name}, ${s.venue.city}, ${s.venue.countryCode}`,
      description: `${s.bands.map((b) => b.band.name).join(", ")}\n${env.NEXT_PUBLIC_APP_URL}/concerts/${s.slug}`,
      url: `${env.NEXT_PUBLIC_APP_URL}/concerts/${s.slug}`,
    }))
  );

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="my-shows.ics"`,
      "Cache-Control": "private, max-age=300",
    },
  });
}
