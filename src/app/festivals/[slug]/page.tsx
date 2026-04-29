import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarRange, MapPin, Ticket, ExternalLink } from "lucide-react";
import { formatDate, formatPrice } from "@/lib/utils";
import { providerLabel } from "@/server/affiliate";

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getFestival(slug: string) {
  return db.festival
    .findUnique({
      where: { slug },
      include: {
        bookings: {
          orderBy: [{ day: "asc" }, { position: "asc" }],
          include: {
            band: {
              select: {
                slug: true,
                name: true,
                countryCode: true,
                undergroundScore: true,
                heaviness: true,
              },
            },
          },
        },
        tickets: { orderBy: { priceMinor: "asc" } },
        sources: true,
      },
    })
    .catch(() => null);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const f = await getFestival(slug);
  if (!f) return { title: "Festival not found" };
  return {
    title: f.name,
    description:
      f.description ?? `${f.name} — ${f.city}, ${f.countryCode}, ${formatDate(f.startDate)}`,
  };
}

export default async function FestivalPage({ params }: PageProps) {
  const { slug } = await params;
  const fest = await getFestival(slug);
  if (!fest) notFound();

  const days = Math.ceil(
    (fest.endDate.getTime() - fest.startDate.getTime()) /
      (1000 * 60 * 60 * 24)
  ) + 1;

  // Group bookings by day (null day -> "TBA")
  type Booking = (typeof fest.bookings)[number];
  const byDay = new Map<string, Booking[]>();
  for (const b of fest.bookings) {
    const key = b.day ? `Day ${b.day}` : "Line-up (day TBA)";
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(b);
  }

  return (
    <div className="container py-10 md:py-14 max-w-4xl">
      <nav className="text-xs text-muted-foreground mb-4">
        <Link href="/festivals" className="hover:text-foreground">
          Festivals
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{fest.name}</span>
      </nav>

      <header className="mb-10">
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="rust">{days}-day</Badge>
          <Badge variant="outline">{fest.status.toLowerCase()}</Badge>
          {fest.undergroundScore >= 8 && <Badge variant="blood">underground</Badge>}
          {fest.verified && <Badge variant="blood">verified</Badge>}
        </div>
        <h1 className="font-display text-5xl md:text-6xl tracking-tight text-shadow-blood">
          {fest.name}
        </h1>
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <CalendarRange className="h-3.5 w-3.5" />{" "}
            {formatDate(fest.startDate)} – {formatDate(fest.endDate)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" /> {fest.city},{" "}
            <span className="font-mono">{fest.countryCode}</span>
            {fest.venueName ? ` · ${fest.venueName}` : ""}
          </span>
          {fest.priceMinor != null && (
            <span className="inline-flex items-center gap-1.5">
              <Ticket className="h-3.5 w-3.5" /> from{" "}
              {formatPrice(fest.priceMinor, fest.currency ?? "EUR")}
            </span>
          )}
        </div>
        {fest.description && (
          <p className="mt-6 max-w-2xl text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
            {fest.description}
          </p>
        )}
      </header>

      {fest.tickets.length > 0 && (
        <Card className="mb-10">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Ticket className="h-4 w-4 text-primary" /> Passes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {fest.tickets.map((t) => (
                <a
                  key={t.id}
                  href={t.url}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className="border border-border rounded-sm p-3 hover:border-primary hover:bg-card/80"
                >
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    {providerLabel(t.provider)}
                  </p>
                  <p className="font-medium mt-1">{t.passType ?? "Pass"}</p>
                  {t.priceMinor != null && (
                    <p className="text-sm text-primary font-mono mt-1">
                      {formatPrice(t.priceMinor, t.currency ?? "EUR")}
                    </p>
                  )}
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <section>
        <h2 className="font-display text-3xl mb-5">Line-up</h2>
        {fest.bookings.length === 0 ? (
          <p className="text-muted-foreground italic">
            No bands announced yet.
          </p>
        ) : (
          <div className="space-y-8">
            {[...byDay.entries()].map(([dayLabel, list]) => (
              <div key={dayLabel}>
                <p className="text-[10px] uppercase tracking-widest text-primary mb-3">
                  {dayLabel}
                </p>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {list.map((b) => (
                    <Link
                      key={b.bandId}
                      href={`/bands/${b.band.slug}`}
                      className="block hover:bg-card/40 px-3 py-2 rounded-sm border border-border/40"
                    >
                      <span
                        className={
                          b.position === 0
                            ? "font-display text-lg group-hover:text-primary"
                            : "text-sm hover:text-primary"
                        }
                      >
                        {b.band.name}
                      </span>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
                        [{b.band.countryCode ?? "—"}]
                        {b.stage ? ` · ${b.stage}` : ""}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {fest.sources.length > 0 && (
        <section className="mt-12 pt-8 border-t border-border/60">
          <h2 className="font-display text-xl mb-3">Sources</h2>
          <ul className="space-y-1.5">
            {fest.sources.map((s) => (
              <li key={s.id}>
                <a
                  href={s.url ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />{" "}
                  {s.type.replace("_", " ").toLowerCase()}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
