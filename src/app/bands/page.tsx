import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

export const metadata: Metadata = {
  title: "Bands",
  description:
    "Browse the encyclopedia of rock and metal bands — from stadium acts to scene-only one-demo wonders.",
};

interface PageProps {
  searchParams: Promise<{ q?: string; country?: string; genre?: string }>;
}

const PAGE_SIZE = 24;

export default async function BandsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const where = {
    ...(params.q
      ? { name: { contains: params.q, mode: "insensitive" as const } }
      : {}),
    ...(params.country ? { countryCode: params.country.toUpperCase() } : {}),
    ...(params.genre
      ? { genres: { some: { genre: { slug: params.genre } } } }
      : {}),
  };

  const [bands, total, countries] = await Promise.all([
    db.band
      .findMany({
        where,
        take: PAGE_SIZE,
        orderBy: [{ undergroundScore: "desc" }, { name: "asc" }],
        include: { genres: { include: { genre: true } } },
      })
      .catch(() => []),
    db.band.count({ where }).catch(() => 0),
    db.band
      .groupBy({
        by: ["countryCode"],
        _count: true,
        where: { countryCode: { not: null } },
        orderBy: { _count: { countryCode: "desc" } },
        take: 12,
      })
      .catch(() => []),
  ]);

  return (
    <div className="container py-10 md:py-14">
      <header className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-2">
            ⛧ Encyclopedia
          </p>
          <h1 className="font-display text-4xl md:text-5xl">Bands</h1>
          <p className="text-muted-foreground mt-2">
            {total.toLocaleString()} bands indexed · sorted by underground score
          </p>
        </div>
        <form className="flex gap-2 items-center" action="/bands">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              name="q"
              defaultValue={params.q ?? ""}
              placeholder="Search bands..."
              className="pl-9 w-72"
            />
          </div>
          <Button type="submit" size="sm" variant="outline">
            Search
          </Button>
        </form>
      </header>

      {countries.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground self-center">
            By country:
          </span>
          {countries.map((c) => (
            <Link
              key={c.countryCode}
              href={`/bands?country=${c.countryCode}`}
              className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-primary"
            >
              {c.countryCode} ({c._count})
            </Link>
          ))}
          <Link
            href="/bg-archive"
            className="text-[10px] uppercase tracking-widest text-primary hover:text-blood-glow ml-auto"
          >
            BG Archive →
          </Link>
        </div>
      )}

      {bands.length === 0 ? (
        <EmptyState query={params.q ?? null} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {bands.map((b) => (
            <Link key={b.id} href={`/bands/${b.slug}`} className="group">
              <Card className="h-full hover:border-primary/60 transition-colors">
                <CardHeader>
                  <CardTitle className="group-hover:text-primary transition-colors">
                    {b.name}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground font-mono">
                    {b.countryCode ? `[${b.countryCode}]` : "[—]"}
                    {b.formedYear ? ` · ${b.formedYear}` : ""}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1.5">
                    {b.genres.slice(0, 3).map((g) => (
                      <Badge key={g.genreId} variant="outline">
                        {g.genre.name}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground font-mono mt-3">
                    <span>⚡ {b.heaviness}/10</span>
                    <span>⛧ {b.undergroundScore}/10</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ query }: { query: string | null }) {
  return (
    <div className="text-center py-20 border border-dashed border-border rounded-sm">
      <p className="font-display text-2xl mb-2">The crypt is empty.</p>
      <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
        {query
          ? `No bands matched "${query}".`
          : "No bands have been seeded yet. Run the seed script or use AI Discovery to add bands."}
      </p>
      <div className="flex justify-center gap-2">
        <Button asChild variant="spike">
          <Link href="/discover">Try AI Discovery</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/bands">Reset</Link>
        </Button>
      </div>
    </div>
  );
}
