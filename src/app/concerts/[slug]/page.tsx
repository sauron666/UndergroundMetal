import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Ticket, Clock, CalendarPlus } from "lucide-react";
import { formatDate, formatPrice } from "@/lib/utils";
import { providerLabel } from "@/server/affiliate";
import { PriceHistorySparkline } from "@/components/concerts/price-history";

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getShow(slug: string) {
  return db.show
    .findUnique({
      where: { slug },
      include: {
        venue: true,
        bands: { include: { band: true }, orderBy: { position: "asc" } },
        tickets: {
          include: {
            priceHistory: {
              orderBy: { observedAt: "asc" },
              take: 60,
            },
          },
        },
      },
    })
    .catch(() => null);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const show = await getShow(slug);
  if (!show) return { title: "Concert not found" };
  return {
    title: show.title,
    description: `${show.title} — ${show.venue.name}, ${show.venue.city} on ${formatDate(show.date)}`,
  };
}

export default async function ShowPage({ params }: PageProps) {
  const { slug } = await params;
  const show = await getShow(slug);
  if (!show) notFound();

  return (
    <div className="container py-10 md:py-14 max-w-4xl">
      <nav className="text-xs text-muted-foreground mb-6">
        <Link href="/concerts" className="hover:text-foreground">Concerts</Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{show.title}</span>
      </nav>

      <header className="mb-8">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Badge variant="blood">{show.status.toLowerCase()}</Badge>
          {show.verified && <Badge variant="outline">Verified</Badge>}
        </div>
        <h1 className="font-display text-4xl md:text-5xl tracking-tight">
          {show.title}
        </h1>
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" /> {formatDate(show.date)}
          </span>
          {show.doorsAt && (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" /> doors{" "}
              {new Date(show.doorsAt).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" /> {show.venue.name}, {show.venue.city}
          </span>
          {show.ageLimit && <span>· {show.ageLimit}+</span>}
          <a
            href={`/api/calendar/show/${show.slug}`}
            className="inline-flex items-center gap-1.5 ml-auto hover:text-primary"
          >
            <CalendarPlus className="h-3.5 w-3.5" /> Add to calendar
          </a>
        </div>
      </header>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ticket className="h-4 w-4 text-primary" /> Tickets
          </CardTitle>
        </CardHeader>
        <CardContent>
          {show.tickets.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No ticket links yet. Check the venue website.
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {show.tickets.map((t) => (
                <a
                  key={t.id}
                  href={`/api/click?id=${t.id}`}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className="flex flex-col gap-2 border border-border p-4 hover:border-primary hover:bg-card/80 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium uppercase tracking-widest text-xs">
                        {providerLabel(t.provider)}
                      </p>
                      {t.priceMinor != null && (
                        <p className="text-sm text-muted-foreground mt-1">
                          from {formatPrice(t.priceMinor, t.currency ?? "EUR")}
                        </p>
                      )}
                    </div>
                    <span className="text-primary text-sm">→</span>
                  </div>
                  {t.priceHistory.length > 1 && (
                    <PriceHistorySparkline
                      points={t.priceHistory.map((p) => ({
                        observedAt: p.observedAt,
                        priceMinor: p.priceMinor,
                      }))}
                      currency={t.currency}
                    />
                  )}
                  {/* spacer used to be the chevron */}
                  <span className="hidden">→</span>
                </a>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <section className="mb-8">
        <h2 className="font-display text-2xl mb-4">Line-up</h2>
        <ul className="space-y-2">
          {show.bands.map((b, i) => (
            <li key={b.bandId} className="flex items-baseline gap-3">
              <span className="text-muted-foreground font-mono text-xs w-6">
                {String(i + 1).padStart(2, "0")}
              </span>
              <Link
                href={`/bands/${b.band.slug}`}
                className={
                  b.position === 0
                    ? "font-display text-2xl hover:text-primary"
                    : "text-lg hover:text-primary"
                }
              >
                {b.band.name}
              </Link>
              {b.position === 0 && (
                <Badge variant="blood" className="ml-2">Headliner</Badge>
              )}
            </li>
          ))}
        </ul>
      </section>

      {show.description && (
        <section>
          <h2 className="font-display text-2xl mb-3">Details</h2>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
            {show.description}
          </p>
        </section>
      )}
    </div>
  );
}
