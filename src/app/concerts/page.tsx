import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Ticket } from "lucide-react";
import { formatDate, formatPrice } from "@/lib/utils";
import { providerLabel } from "@/server/affiliate";

export const metadata: Metadata = {
  title: "Concerts",
  description:
    "Upcoming rock and metal concerts — filter by city or country. Direct ticket links to Ticketpro, Eventim, DICE, and box-office.",
};

interface PageProps {
  searchParams: Promise<{
    city?: string;
    country?: string;
    q?: string;
    from?: string;
    to?: string;
    priceMax?: string;
  }>;
}

export default async function ConcertsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const fromDate = params.from ? new Date(params.from) : new Date();
  const toDate = params.to ? new Date(params.to) : null;
  const priceMaxMinor = params.priceMax
    ? Math.round(Number(params.priceMax) * 100)
    : null;

  const where = {
    date: {
      gte: fromDate,
      ...(toDate ? { lte: toDate } : {}),
    },
    status: { not: "PAST" as const },
    ...(params.city
      ? { venue: { city: { contains: params.city, mode: "insensitive" as const } } }
      : {}),
    ...(params.country
      ? { venue: { countryCode: params.country.toUpperCase() } }
      : {}),
    ...(params.q
      ? { title: { contains: params.q, mode: "insensitive" as const } }
      : {}),
    ...(priceMaxMinor != null
      ? { priceMinor: { lte: priceMaxMinor } }
      : {}),
  };

  const shows = await db.show
    .findMany({
      where,
      include: {
        venue: true,
        bands: { include: { band: true }, orderBy: { position: "asc" } },
        tickets: true,
      },
      orderBy: [{ date: "asc" }],
      take: 50,
    })
    .catch(() => []);

  return (
    <div className="container py-10 md:py-14">
      <header className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-2">
            ⛧ Live
          </p>
          <h1 className="font-display text-4xl md:text-5xl">Concerts</h1>
          <p className="text-muted-foreground mt-2">
            {shows.length.toLocaleString()} upcoming shows
          </p>
        </div>
        <form
          className="grid grid-cols-2 sm:grid-cols-3 lg:flex gap-2 lg:items-end"
          action="/concerts"
        >
          {params.q && <input type="hidden" name="q" value={params.q} />}
          <label className="block">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 block">
              City
            </span>
            <Input
              name="city"
              defaultValue={params.city ?? ""}
              placeholder="Sofia"
              className="w-32"
            />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 block">
              Country
            </span>
            <Input
              name="country"
              defaultValue={params.country ?? ""}
              placeholder="BG"
              maxLength={2}
              className="w-20"
            />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 block">
              From
            </span>
            <Input
              name="from"
              type="date"
              defaultValue={params.from ?? ""}
              className="w-40"
            />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 block">
              To
            </span>
            <Input
              name="to"
              type="date"
              defaultValue={params.to ?? ""}
              className="w-40"
            />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 block">
              Max price
            </span>
            <Input
              name="priceMax"
              type="number"
              step="0.01"
              defaultValue={params.priceMax ?? ""}
              placeholder="40"
              className="w-24"
            />
          </label>
          <Button type="submit" size="sm" variant="outline" className="self-end">
            Apply
          </Button>
        </form>
      </header>

      {shows.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border rounded-sm">
          <p className="font-display text-2xl mb-2">No shows scheduled.</p>
          <p className="text-sm text-muted-foreground">
            Either adjust filters or check back later.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {shows.map((s) => (
            <Card key={s.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle>
                      <Link href={`/concerts/${s.slug}`} className="hover:text-primary">
                        {s.title}
                      </Link>
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-4 gap-y-1">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {formatDate(s.date)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {s.venue.name}, {s.venue.city} [{s.venue.countryCode}]
                      </span>
                    </p>
                  </div>
                  {s.priceMinor != null && (
                    <Badge variant="rust">
                      from {formatPrice(s.priceMinor, s.currency ?? "EUR")}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-2 mb-3">
                  {s.bands.map((b) => (
                    <Link
                      key={b.bandId}
                      href={`/bands/${b.band.slug}`}
                      className="text-xs text-foreground hover:text-primary"
                    >
                      {b.position === 0 ? <strong>{b.band.name}</strong> : b.band.name}
                    </Link>
                  ))}
                </div>
                {s.tickets.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-border/40">
                    {s.tickets.map((t) => (
                      <a
                        key={t.id}
                        href={`/api/click?id=${t.id}`}
                        target="_blank"
                        rel="noopener noreferrer sponsored"
                        className="inline-flex items-center gap-1 text-[11px] uppercase tracking-widest border border-border px-3 py-1.5 hover:border-primary hover:text-primary transition-colors"
                      >
                        <Ticket className="h-3 w-3" />
                        {providerLabel(t.provider)}
                        {t.priceMinor != null && (
                          <span className="text-muted-foreground ml-1">
                            {formatPrice(t.priceMinor, t.currency ?? "EUR")}
                          </span>
                        )}
                      </a>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
