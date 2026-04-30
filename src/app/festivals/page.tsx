import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CalendarRange, MapPin } from "lucide-react";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Festivals",
  description:
    "Multi-day metal and rock festivals — line-ups, tickets, dates. Underground first.",
};

interface PageProps {
  searchParams: Promise<{
    country?: string;
    past?: string;
    q?: string;
    underMin?: string;
    month?: string;
  }>;
}

export default async function FestivalsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const includePast = params.past === "1";
  const underMin = params.underMin ? Number(params.underMin) : null;
  const month = params.month && /^\d{4}-\d{2}$/.test(params.month) ? params.month : null;

  const monthStart = month ? new Date(`${month}-01T00:00:00Z`) : null;
  const monthEnd = monthStart
    ? new Date(
        Date.UTC(
          monthStart.getUTCFullYear(),
          monthStart.getUTCMonth() + 1,
          1
        )
      )
    : null;

  const festivals = await db.festival
    .findMany({
      where: {
        ...(includePast
          ? {}
          : monthStart
          ? {
              startDate: { lt: monthEnd! },
              endDate: { gte: monthStart },
            }
          : { endDate: { gte: new Date() } }),
        ...(params.country
          ? { countryCode: params.country.toUpperCase() }
          : {}),
        ...(underMin != null ? { undergroundScore: { gte: underMin } } : {}),
        ...(params.q
          ? { name: { contains: params.q, mode: "insensitive" as const } }
          : {}),
        status: { not: "CANCELLED" },
      },
      include: {
        bookings: {
          take: 6,
          orderBy: { position: "asc" },
          include: { band: { select: { name: true, slug: true } } },
        },
        _count: { select: { bookings: true } },
      },
      orderBy: includePast
        ? { startDate: "desc" }
        : { startDate: "asc" },
      take: 50,
    })
    .catch(() => []);

  return (
    <div className="container py-10 md:py-14">
      <header className="flex items-end justify-between mb-6 flex-wrap gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-2 flex items-center gap-1.5">
            <CalendarRange className="h-3 w-3" /> Festivals
          </p>
          <h1 className="font-display text-4xl md:text-5xl">
            Multi-day rituals.
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {festivals.length} festival{festivals.length === 1 ? "" : "s"}
            {includePast ? " · including past" : month ? ` · ${month}` : " upcoming"}
          </p>
        </div>
        <Link
          href={`/festivals?past=${includePast ? "0" : "1"}`}
          className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-primary"
        >
          {includePast ? "Hide past" : "Show past"} →
        </Link>
      </header>

      <form
        action="/festivals"
        className="flex flex-wrap gap-2 items-end mb-8 p-3 border border-border rounded-sm"
      >
        {includePast && <input type="hidden" name="past" value="1" />}
        <label className="block">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 block">
            Search
          </span>
          <Input
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Wacken"
            className="w-44"
          />
        </label>
        <label className="block">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 block">
            Country
          </span>
          <Input
            name="country"
            defaultValue={params.country ?? ""}
            placeholder="DE"
            maxLength={2}
            className="w-20"
          />
        </label>
        <label className="block">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 block">
            Month
          </span>
          <Input
            name="month"
            type="month"
            defaultValue={params.month ?? ""}
            className="w-40"
          />
        </label>
        <label className="block">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 block">
            Min underground
          </span>
          <Input
            name="underMin"
            type="number"
            min={1}
            max={10}
            defaultValue={params.underMin ?? ""}
            className="w-20"
          />
        </label>
        <Button type="submit" size="sm" variant="outline" className="self-end">
          Apply
        </Button>
        <Link
          href="/festivals"
          className="self-end text-[10px] uppercase tracking-widest text-muted-foreground hover:text-primary px-2"
        >
          Reset
        </Link>
      </form>

      {festivals.length === 0 ? (
        <p className="text-center text-muted-foreground italic py-20">
          No festivals catalogued yet.
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {festivals.map((f) => {
            const days = Math.ceil(
              (f.endDate.getTime() - f.startDate.getTime()) /
                (1000 * 60 * 60 * 24)
            ) + 1;
            return (
              <Link
                key={f.id}
                href={`/festivals/${f.slug}`}
                className="group"
              >
                <Card className="hover:border-primary/60 transition-colors h-full">
                  <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="rust">{days}-day</Badge>
                      <Badge variant="outline">
                        {f.status.toLowerCase()}
                      </Badge>
                      {f.undergroundScore >= 8 && (
                        <Badge variant="blood">underground</Badge>
                      )}
                    </div>
                    <CardTitle className="group-hover:text-primary transition-colors">
                      {f.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground mb-2 inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {f.city},{" "}
                      <span className="font-mono">{f.countryCode}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mb-3">
                      {formatDate(f.startDate)} – {formatDate(f.endDate)}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {f.bookings.slice(0, 5).map((b) => (
                        <span
                          key={b.bandId}
                          className="text-[10px] uppercase tracking-widest text-muted-foreground"
                        >
                          {b.band.name}
                        </span>
                      ))}
                      {f._count.bookings > 5 && (
                        <span className="text-[10px] text-primary">
                          +{f._count.bookings - 5}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
