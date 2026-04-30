import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";

export const runtime = "nodejs";

const FestivalIn = z.object({
  slug: z.string().optional(),
  name: z.string().min(1).max(200),
  startDate: z.string(),
  endDate: z.string(),
  city: z.string().min(1).max(120),
  countryCode: z.string().length(2),
  venueName: z.string().nullable().optional(),
  websiteUrl: z.string().url().nullable().optional(),
  posterUrl: z.string().url().nullable().optional(),
  description: z.string().nullable().optional(),
  status: z
    .enum(["ANNOUNCED", "CONFIRMED", "CANCELLED", "POSTPONED", "PAST"])
    .default("ANNOUNCED"),
  undergroundScore: z.number().int().min(1).max(10).default(5),
  verified: z.boolean().default(false),
  bands: z
    .array(
      z.object({
        slug: z.string(),
        position: z.number().int().min(0).max(999).default(99),
        day: z.number().int().min(1).max(31).nullable().optional(),
        stage: z.string().nullable().optional(),
      })
    )
    .default([]),
  tickets: z
    .array(
      z.object({
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
        currency: z.string().length(3).nullable().optional(),
        passType: z.string().nullable().optional(),
      })
    )
    .default([]),
});

const Body = z.object({
  festivals: z.array(FestivalIn).min(1).max(200),
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

  // Resolve all referenced band slugs once
  const allBandSlugs = Array.from(
    new Set(parsed.data.festivals.flatMap((f) => f.bands.map((b) => b.slug)))
  );
  const bands = allBandSlugs.length
    ? await db.band.findMany({
        where: { slug: { in: allBandSlugs } },
        select: { id: true, slug: true },
      })
    : [];
  const bandIdBySlug = new Map(bands.map((b) => [b.slug, b.id]));
  const skippedBands = new Set<string>();
  for (const s of allBandSlugs) {
    if (!bandIdBySlug.has(s)) skippedBands.add(s);
  }

  let created = 0;
  let updated = 0;

  for (const f of parsed.data.festivals) {
    const slug = f.slug ?? (slugify(f.name).slice(0, 80) || "festival");
    const existing = await db.festival.findUnique({ where: { slug } });

    const data = {
      name: f.name,
      startDate: new Date(f.startDate),
      endDate: new Date(f.endDate),
      city: f.city,
      countryCode: f.countryCode,
      venueName: f.venueName ?? null,
      websiteUrl: f.websiteUrl ?? null,
      posterUrl: f.posterUrl ?? null,
      description: f.description ?? null,
      status: f.status,
      undergroundScore: f.undergroundScore,
      verified: f.verified,
    };

    let festival;
    if (existing) {
      festival = await db.festival.update({ where: { slug }, data });
      updated += 1;
      // Replace bookings + tickets entirely on re-import for predictability
      await db.festivalBooking.deleteMany({ where: { festivalId: festival.id } });
      await db.festivalTicket.deleteMany({ where: { festivalId: festival.id } });
    } else {
      festival = await db.festival.create({ data: { ...data, slug } });
      created += 1;
    }

    // Bookings — only for resolvable slugs
    for (const b of f.bands) {
      const bandId = bandIdBySlug.get(b.slug);
      if (!bandId) continue;
      await db.festivalBooking.create({
        data: {
          festivalId: festival.id,
          bandId,
          position: b.position,
          day: b.day ?? null,
          stage: b.stage ?? null,
        },
      });
    }

    for (const t of f.tickets) {
      await db.festivalTicket.create({
        data: {
          festivalId: festival.id,
          provider: t.provider,
          url: t.url,
          priceMinor: t.priceMinor ?? null,
          currency: t.currency ?? null,
          passType: t.passType ?? null,
        },
      });
    }
  }

  return NextResponse.json({
    created,
    updated,
    skippedBands: Array.from(skippedBands),
  });
}
