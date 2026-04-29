import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarRange, MapPin } from "lucide-react";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Festivals",
  description:
    "Multi-day metal and rock festivals — line-ups, tickets, dates. Underground first.",
};

interface PageProps {
  searchParams: Promise<{ country?: string; past?: string }>;
}

export default async function FestivalsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const includePast = params.past === "1";

  const festivals = await db.festival
    .findMany({
      where: {
        ...(includePast ? {} : { endDate: { gte: new Date() } }),
        ...(params.country
          ? { countryCode: params.country.toUpperCase() }
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
      <header className="flex items-end justify-between mb-8 flex-wrap gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-2 flex items-center gap-1.5">
            <CalendarRange className="h-3 w-3" /> Festivals
          </p>
          <h1 className="font-display text-4xl md:text-5xl">
            Multi-day rituals.
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {festivals.length} festival{festivals.length === 1 ? "" : "s"}
            {includePast ? " · including past" : " upcoming"}
          </p>
        </div>
        <Link
          href={`/festivals?past=${includePast ? "0" : "1"}`}
          className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-primary"
        >
          {includePast ? "Hide past" : "Show past"} →
        </Link>
      </header>

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
