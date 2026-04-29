import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Calendar",
  description: "Upcoming concerts and festivals on a month grid.",
};

interface PageProps {
  searchParams: Promise<{ y?: string; m?: string; country?: string }>;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default async function CalendarPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const today = new Date();
  const year = params.y ? Number(params.y) : today.getUTCFullYear();
  const month = params.m ? Number(params.m) - 1 : today.getUTCMonth();

  const start = new Date(Date.UTC(year, month, 1));
  const end = new Date(Date.UTC(year, month + 1, 1));

  const where = {
    date: { gte: start, lt: end },
    ...(params.country
      ? { venue: { countryCode: params.country.toUpperCase() } }
      : {}),
  };

  const shows = await db.show
    .findMany({
      where,
      include: {
        venue: true,
        bands: {
          include: { band: { select: { name: true, slug: true } } },
          orderBy: { position: "asc" },
          take: 3,
        },
      },
      orderBy: { date: "asc" },
    })
    .catch(() => []);

  // Group shows by day-of-month
  type ShowRow = (typeof shows)[number];
  const byDay = new Map<number, ShowRow[]>();
  for (const s of shows) {
    const day = new Date(s.date).getUTCDate();
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push(s);
  }

  // Build the calendar grid: pad start to Monday
  const firstWeekday = (start.getUTCDay() + 6) % 7; // 0 = Mon
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const monthName = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(start);

  const prev = new Date(Date.UTC(year, month - 1, 1));
  const next = new Date(Date.UTC(year, month + 1, 1));

  const linkFor = (d: Date) =>
    `/calendar?y=${d.getUTCFullYear()}&m=${d.getUTCMonth() + 1}${
      params.country ? `&country=${params.country}` : ""
    }`;

  return (
    <div className="container py-10 md:py-14">
      <header className="flex items-end justify-between mb-8 gap-4 flex-wrap">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-2 flex items-center gap-1.5">
            <CalendarDays className="h-3 w-3" /> Calendar
          </p>
          <h1 className="font-display text-4xl md:text-5xl">{monthName}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {shows.length} show{shows.length === 1 ? "" : "s"}
            {params.country ? ` · ${params.country.toUpperCase()}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={linkFor(prev)}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-[10px] uppercase tracking-widest border border-border rounded-sm hover:border-primary"
          >
            <ChevronLeft className="h-3 w-3" /> Prev
          </Link>
          <Link
            href={linkFor(next)}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-[10px] uppercase tracking-widest border border-border rounded-sm hover:border-primary"
          >
            Next <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      </header>

      <div className="hidden md:grid grid-cols-7 gap-px bg-border rounded-sm overflow-hidden border border-border">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="bg-card px-2 py-2 text-[10px] uppercase tracking-widest text-muted-foreground text-center"
          >
            {d}
          </div>
        ))}
        {cells.map((d, i) => {
          const dayShows = d ? byDay.get(d) ?? [] : [];
          const isToday =
            d != null &&
            today.getUTCFullYear() === year &&
            today.getUTCMonth() === month &&
            today.getUTCDate() === d;
          return (
            <div
              key={i}
              className={
                d == null
                  ? "bg-background min-h-[110px]"
                  : isToday
                  ? "bg-card/80 min-h-[110px] p-1.5 ring-1 ring-primary"
                  : "bg-card/40 min-h-[110px] p-1.5 hover:bg-card/60"
              }
            >
              {d != null && (
                <>
                  <div className="text-xs font-mono text-muted-foreground mb-1 flex justify-between">
                    <span className={isToday ? "text-primary" : ""}>{d}</span>
                    {dayShows.length > 0 && (
                      <Badge variant="blood">{dayShows.length}</Badge>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    {dayShows.slice(0, 3).map((s) => (
                      <Link
                        key={s.id}
                        href={`/concerts/${s.slug}`}
                        className="block truncate text-[11px] hover:text-primary"
                      >
                        <span className="text-muted-foreground font-mono">·</span>{" "}
                        {s.bands[0]?.band.name ?? s.title}
                      </Link>
                    ))}
                    {dayShows.length > 3 && (
                      <p className="text-[10px] text-muted-foreground">
                        +{dayShows.length - 3} more
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile: simple list */}
      <div className="md:hidden space-y-3">
        {[...byDay.entries()].sort((a, b) => a[0] - b[0]).map(([day, list]) => (
          <div key={day}>
            <p className="text-[10px] uppercase tracking-widest text-primary mb-1">
              {monthName.split(" ")[0]} {day}
            </p>
            <div className="space-y-1">
              {list.map((s) => (
                <Link
                  key={s.id}
                  href={`/concerts/${s.slug}`}
                  className="block border border-border rounded-sm px-3 py-2 hover:border-primary"
                >
                  <p className="text-sm font-medium truncate">
                    {s.bands[0]?.band.name ?? s.title}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {s.venue.name}, {s.venue.city}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
