import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { ConcertMapLoader } from "@/components/concerts/concert-map-loader";

export const metadata: Metadata = {
  title: "Concert map",
  description:
    "Upcoming rock and metal concerts on a map. Click a marker to open the show details.",
};

interface PageProps {
  searchParams: Promise<{ country?: string }>;
}

export default async function ConcertMapPage({ searchParams }: PageProps) {
  const { country } = await searchParams;

  const shows = await db.show
    .findMany({
      where: {
        date: { gte: new Date() },
        status: { not: "PAST" },
        venue: {
          latitude: { not: null },
          longitude: { not: null },
          ...(country
            ? { countryCode: country.toUpperCase() }
            : {}),
        },
      },
      include: { venue: true },
      orderBy: { date: "asc" },
      take: 500,
    })
    .catch(() => []);

  const points = shows
    .filter(
      (s) =>
        s.venue.latitude != null &&
        s.venue.longitude != null
    )
    .map((s) => ({
      id: s.id,
      slug: s.slug,
      title: s.title,
      date: s.date.toISOString(),
      venueName: s.venue.name,
      city: s.venue.city,
      countryCode: s.venue.countryCode,
      lat: s.venue.latitude!,
      lng: s.venue.longitude!,
    }));

  return (
    <div className="container py-10 md:py-14">
      <header className="flex items-end justify-between mb-6 gap-4 flex-wrap">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-2">
            ⛧ Map
          </p>
          <h1 className="font-display text-4xl md:text-5xl">Concerts on a map.</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {points.length} show{points.length === 1 ? "" : "s"} with venue
            coordinates
            {country ? ` · ${country.toUpperCase()}` : ""}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/concerts">List view →</Link>
        </Button>
      </header>

      <ConcertMapLoader shows={points} />

      {points.length === 0 && (
        <p className="text-xs text-muted-foreground italic mt-4">
          No venues have lat/lng yet — fill them in via{" "}
          <Link href="/admin/venues" className="text-primary">
            admin venues
          </Link>
          .
        </p>
      )}
    </div>
  );
}
