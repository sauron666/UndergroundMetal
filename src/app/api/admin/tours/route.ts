import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";
import { announceShow } from "@/server/concerts/announce";

export const runtime = "nodejs";

const ShowIn = z.object({
  date: z.string().datetime(),
  venueSlug: z.string().optional(),
  venueName: z.string().optional(),
  city: z.string().optional(),
  countryCode: z.string().length(2).optional(),
  ticket: z
    .object({
      provider: z.enum([
        "TICKETPRO",
        "EVENTIM",
        "SEETICKETS",
        "TICKETMASTER",
        "DICE",
        "BANDCAMP",
        "DIRECT",
        "OTHER",
      ]),
      url: z.string().url(),
      priceMinor: z.number().int().min(0).nullable().optional(),
    })
    .nullable()
    .optional(),
});

const Body = z.object({
  headlinerId: z.string(),
  supportIds: z.array(z.string()).max(20).default([]),
  shows: z.array(ShowIn).min(1).max(60),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !["EDITOR", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const headliner = await db.band.findUnique({
    where: { id: parsed.data.headlinerId },
    select: { id: true, name: true },
  });
  if (!headliner) {
    return NextResponse.json({ error: "Headliner not found" }, { status: 404 });
  }

  let created = 0;
  let skipped = 0;

  for (const s of parsed.data.shows) {
    // Resolve or create venue
    let venueId: string | null = null;
    if (s.venueSlug) {
      const v = await db.venue.findUnique({
        where: { slug: s.venueSlug },
        select: { id: true },
      });
      if (v) venueId = v.id;
    }
    if (!venueId && s.venueName && s.city && s.countryCode) {
      const slug = slugify(`${s.venueName}-${s.city}`).slice(0, 80) || "venue";
      const v = await db.venue.upsert({
        where: { slug },
        create: {
          slug,
          name: s.venueName,
          city: s.city,
          countryCode: s.countryCode.toUpperCase(),
        },
        update: {},
      });
      venueId = v.id;
    }
    if (!venueId) {
      skipped += 1;
      continue;
    }

    const date = new Date(s.date);
    const showSlug =
      slugify(
        `${headliner.name}-${date.toISOString().slice(0, 10)}-${venueId.slice(0, 6)}`
      ).slice(0, 80) || "show";

    const exists = await db.show.findUnique({ where: { slug: showSlug } });
    if (exists) {
      skipped += 1;
      continue;
    }

    const show = await db.show.create({
      data: {
        slug: showSlug,
        title: `${headliner.name} live`,
        date,
        venueId,
        status: "SCHEDULED",
        priceMinor: s.ticket?.priceMinor ?? null,
        currency: s.ticket ? "EUR" : null,
        bands: {
          create: [
            { bandId: headliner.id, position: 0 },
            ...parsed.data.supportIds.map((id, idx) => ({
              bandId: id,
              position: idx + 1,
            })),
          ],
        },
        tickets: s.ticket
          ? {
              create: [
                {
                  provider: s.ticket.provider,
                  url: s.ticket.url,
                  priceMinor: s.ticket.priceMinor ?? null,
                },
              ],
            }
          : undefined,
      },
    });
    created += 1;

    announceShow(show.id).catch((e) =>
      console.error("[tours] announce failed", e)
    );
  }

  return NextResponse.json({ created, skipped });
}
