import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { parseCsv } from "@/lib/csv";
import { slugify } from "@/lib/utils";

export const runtime = "nodejs";

const STATUSES = new Set([
  "ANNOUNCED",
  "CONFIRMED",
  "CANCELLED",
  "POSTPONED",
  "PAST",
]);

const PROVIDERS = new Set([
  "TICKETPRO",
  "EVENTIM",
  "SEETICKETS",
  "TICKETMASTER",
  "DICE",
  "BANDCAMP",
  "DIRECT",
  "OTHER",
]);

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !["EDITOR", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const text = await req.text();
  let rows: Record<string, string>[];
  try {
    rows = parseCsv(text);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "CSV parse failed" },
      { status: 422 }
    );
  }
  if (rows.length === 0) {
    return NextResponse.json({ error: "Empty CSV" }, { status: 422 });
  }

  // Resolve all referenced band slugs once.
  const allSlugs = Array.from(
    new Set(
      rows.flatMap((r) =>
        (r.bandSlugs ?? "")
          .split(";")
          .map((s) => s.trim())
          .filter(Boolean)
      )
    )
  );
  const bands = allSlugs.length
    ? await db.band.findMany({
        where: { slug: { in: allSlugs } },
        select: { id: true, slug: true },
      })
    : [];
  const bandIdBySlug = new Map(bands.map((b) => [b.slug, b.id] as const));
  const skippedBands = new Set<string>();
  for (const s of allSlugs) {
    if (!bandIdBySlug.has(s)) skippedBands.add(s);
  }

  let created = 0;
  let updated = 0;
  const errors: string[] = [];

  for (const r of rows) {
    try {
      if (!r.name || !r.startDate || !r.endDate || !r.city || !r.countryCode) {
        errors.push(`row "${r.name ?? "?"}" missing required field`);
        continue;
      }
      const status = STATUSES.has(r.status) ? r.status : "ANNOUNCED";
      const slug = r.slug?.trim() || slugify(r.name).slice(0, 80) || "festival";
      const data = {
        name: r.name,
        startDate: new Date(r.startDate),
        endDate: new Date(r.endDate),
        city: r.city,
        countryCode: r.countryCode.toUpperCase(),
        venueName: r.venueName || null,
        websiteUrl: r.websiteUrl || null,
        status: status as never,
        undergroundScore: r.undergroundScore
          ? Math.max(1, Math.min(10, Number(r.undergroundScore)))
          : 5,
      };

      const existing = await db.festival.findUnique({ where: { slug } });
      let festival;
      if (existing) {
        festival = await db.festival.update({ where: { slug }, data });
        updated += 1;
        await db.festivalBooking.deleteMany({
          where: { festivalId: festival.id },
        });
        await db.festivalTicket.deleteMany({
          where: { festivalId: festival.id },
        });
      } else {
        festival = await db.festival.create({ data: { ...data, slug } });
        created += 1;
      }

      const bandSlugs = (r.bandSlugs ?? "")
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean);
      for (let i = 0; i < bandSlugs.length; i++) {
        const bid = bandIdBySlug.get(bandSlugs[i]);
        if (!bid) continue;
        await db.festivalBooking.create({
          data: {
            festivalId: festival.id,
            bandId: bid,
            position: i,
          },
        });
      }

      if (
        r.ticketUrl &&
        r.ticketProvider &&
        PROVIDERS.has(r.ticketProvider)
      ) {
        await db.festivalTicket.create({
          data: {
            festivalId: festival.id,
            provider: r.ticketProvider as never,
            url: r.ticketUrl,
            passType: r.passType || null,
            priceMinor: r.priceMinor ? Number(r.priceMinor) : null,
            currency: r.currency || null,
          },
        });
      }
    } catch (e) {
      errors.push(
        `row "${r.name ?? "?"}": ${
          e instanceof Error ? e.message : "import failed"
        }`
      );
    }
  }

  return NextResponse.json({
    created,
    updated,
    errors,
    skippedBands: Array.from(skippedBands),
  });
}
