/**
 * Concert scraper. Pulls upcoming shows for tracked bands from Bandsintown's
 * public artist endpoint. Bandsintown's public app id "undergroundmetal" is
 * fine for low-volume use; for production register your own.
 *
 * For Bulgarian shows specifically we lean on:
 *   - Songkick (key required)
 *   - Eventim BG public listings (manual import only — no scraping ToS)
 *
 * Run: pnpm scrape:concerts
 */

import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { slugify } from "@/lib/utils";
import { announceShow } from "@/server/concerts/announce";

interface BITEvent {
  id: string;
  url: string;
  datetime: string;
  title?: string;
  description?: string;
  venue: { name: string; city: string; country: string; latitude?: string; longitude?: string };
  lineup: string[];
  offers?: { type: string; url: string; status: string }[];
}

async function fetchBandsintown(artist: string): Promise<BITEvent[]> {
  const url = `https://rest.bandsintown.com/artists/${encodeURIComponent(
    artist
  )}/events?app_id=${encodeURIComponent(env.BANDSINTOWN_APP_ID)}`;
  const res = await fetch(url, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    if (res.status === 404) return [];
    throw new Error(`bandsintown: HTTP ${res.status}`);
  }
  return (await res.json()) as BITEvent[];
}

async function run() {
  const bands = await db.band.findMany({
    where: { status: { in: ["ACTIVE", "ON_HOLD"] } },
    select: { id: true, name: true, slug: true },
    take: 200,
  });

  for (const band of bands) {
    const startedAt = new Date();
    let itemsSeen = 0;
    let itemsNew = 0;
    let status: "OK" | "ERROR" = "OK";
    let error: string | null = null;

    try {
      const events = await fetchBandsintown(band.name);
      itemsSeen = events.length;

      for (const ev of events) {
        const venue = await db.venue.upsert({
          where: { slug: slugify(`${ev.venue.name}-${ev.venue.city}`) },
          create: {
            slug: slugify(`${ev.venue.name}-${ev.venue.city}`),
            name: ev.venue.name,
            city: ev.venue.city,
            countryCode: ev.venue.country.slice(0, 2).toUpperCase(),
            latitude: ev.venue.latitude ? Number(ev.venue.latitude) : null,
            longitude: ev.venue.longitude ? Number(ev.venue.longitude) : null,
          },
          update: {},
        });

        const showSlug = slugify(`${band.name}-${venue.city}-${ev.datetime.slice(0, 10)}`);
        const existing = await db.show.findUnique({ where: { slug: showSlug } });
        if (existing) continue;

        const show = await db.show.create({
          data: {
            slug: showSlug,
            title: ev.title || `${band.name} live in ${venue.city}`,
            date: new Date(ev.datetime),
            venueId: venue.id,
            status: "SCHEDULED",
            description: ev.description ?? null,
            sources: {
              create: {
                type: "BANDSINTOWN",
                externalId: ev.id,
                url: ev.url,
              },
            },
            bands: { create: [{ bandId: band.id, position: 0 }] },
            tickets: ev.offers
              ? {
                  create: ev.offers
                    .filter((o) => o.type === "Tickets" || o.type === "TICKETS")
                    .slice(0, 3)
                    .map((o) => ({
                      provider: "OTHER" as const,
                      url: o.url,
                      available: o.status !== "sold out",
                    })),
                }
              : undefined,
          },
        });
        itemsNew += 1;
        console.log(`[concerts] +${show.title}`);
        await announceShow(show.id).catch((e) =>
          console.error("[concerts] announce failed", e)
        );
      }
    } catch (e) {
      status = "ERROR";
      error = e instanceof Error ? e.message : String(e);
    }

    await db.scrapeRun.create({
      data: {
        source: "BANDSINTOWN",
        target: band.name,
        status,
        itemsSeen,
        itemsNew,
        error,
        startedAt,
        endedAt: new Date(),
      },
    });

    // Be polite
    await new Promise((r) => setTimeout(r, 600));
  }

  await db.$disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
