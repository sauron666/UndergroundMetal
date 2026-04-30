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
  searchParams: Promise<{
    q?: string;
    country?: string;
    genre?: string;
    yearFrom?: string;
    yearTo?: string;
    heavyMin?: string;
    heavyMax?: string;
    underMin?: string;
    sort?: string;
  }>;
}

const PAGE_SIZE = 24;

const SORTS = [
  { value: "underground", label: "Underground" },
  { value: "name", label: "A–Z" },
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
] as const;

type Sort = (typeof SORTS)[number]["value"];

export default async function BandsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const yearFrom = params.yearFrom ? Number(params.yearFrom) : null;
  const yearTo = params.yearTo ? Number(params.yearTo) : null;
  const heavyMin = params.heavyMin ? Number(params.heavyMin) : null;
  const heavyMax = params.heavyMax ? Number(params.heavyMax) : null;
  const underMin = params.underMin ? Number(params.underMin) : null;
  const sort: Sort = (SORTS.find((s) => s.value === params.sort)?.value ??
    "underground") as Sort;

  const where = {
    ...(params.q
      ? { name: { contains: params.q, mode: "insensitive" as const } }
      : {}),
    ...(params.country ? { countryCode: params.country.toUpperCase() } : {}),
    ...(params.genre
      ? { genres: { some: { genre: { slug: params.genre } } } }
      : {}),
    ...(yearFrom != null || yearTo != null
      ? {
          formedYear: {
            ...(yearFrom != null ? { gte: yearFrom } : {}),
            ...(yearTo != null ? { lte: yearTo } : {}),
          },
        }
      : {}),
    ...(heavyMin != null || heavyMax != null
      ? {
          heaviness: {
            ...(heavyMin != null ? { gte: heavyMin } : {}),
            ...(heavyMax != null ? { lte: heavyMax } : {}),
          },
        }
      : {}),
    ...(underMin != null ? { undergroundScore: { gte: underMin } } : {}),
  };

  const orderBy =
    sort === "name"
      ? [{ name: "asc" as const }]
      : sort === "newest"
      ? [{ formedYear: "desc" as const }, { name: "asc" as const }]
      : sort === "oldest"
      ? [{ formedYear: "asc" as const }, { name: "asc" as const }]
      : [{ undergroundScore: "desc" as const }, { name: "asc" as const }];

  const [bands, total, countries, genres] = await Promise.all([
    db.band
      .findMany({
        where,
        take: PAGE_SIZE,
        orderBy,
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
    db.genre
      .findMany({
        select: { slug: true, name: true },
        orderBy: { name: "asc" },
      })
      .catch(() => []),
  ]);

  // Build "carry" query string used by every filter link to preserve the
  // other selections.
  const buildHref = (
    overrides: Partial<Awaited<typeof params>>
  ): string => {
    const sp = new URLSearchParams();
    const merged = { ...params, ...overrides };
    Object.entries(merged).forEach(([k, v]) => {
      if (v != null && v !== "") sp.set(k, String(v));
    });
    const qs = sp.toString();
    return qs ? `/bands?${qs}` : "/bands";
  };

  return (
    <div className="container py-10 md:py-14">
      <header className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-2">
            ⛧ Encyclopedia
          </p>
          <h1 className="font-display text-4xl md:text-5xl">Bands</h1>
          <p className="text-muted-foreground mt-2">
            {total.toLocaleString()} bands · sorted by{" "}
            {SORTS.find((s) => s.value === sort)?.label.toLowerCase()}
          </p>
        </div>
        <form className="flex gap-2 items-center" action="/bands">
          {/* Carry over filter params on text-search submit */}
          {Object.entries(params).map(([k, v]) =>
            k === "q" || v == null || v === "" ? null : (
              <input key={k} type="hidden" name={k} value={String(v)} />
            )
          )}
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

      {/* Filter rail */}
      <details className="mb-6 border border-border rounded-sm">
        <summary className="cursor-pointer px-3 py-2 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground">
          Filters
          {(params.country ||
            params.genre ||
            yearFrom != null ||
            yearTo != null ||
            heavyMin != null ||
            heavyMax != null ||
            underMin != null) && (
            <span className="ml-2 text-primary">· active</span>
          )}
        </summary>
        <form action="/bands" className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 border-t border-border">
          {params.q && <input type="hidden" name="q" value={params.q} />}
          <label className="block">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">
              Genre
            </span>
            <select
              name="genre"
              defaultValue={params.genre ?? ""}
              className="h-10 w-full bg-background/60 border border-input rounded-sm px-3 text-sm"
            >
              <option value="">Any</option>
              {genres.map((g) => (
                <option key={g.slug} value={g.slug}>
                  {g.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">
              Country (ISO 2)
            </span>
            <Input
              name="country"
              defaultValue={params.country ?? ""}
              maxLength={2}
              placeholder="e.g. BG"
            />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">
              Sort
            </span>
            <select
              name="sort"
              defaultValue={sort}
              className="h-10 w-full bg-background/60 border border-input rounded-sm px-3 text-sm uppercase tracking-widest"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">
                Formed from
              </span>
              <Input
                name="yearFrom"
                type="number"
                defaultValue={params.yearFrom ?? ""}
                placeholder="e.g. 1990"
                min={1900}
                max={2100}
              />
            </label>
            <label className="block">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">
                Formed to
              </span>
              <Input
                name="yearTo"
                type="number"
                defaultValue={params.yearTo ?? ""}
                placeholder="e.g. 2010"
                min={1900}
                max={2100}
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">
                Heavy ≥
              </span>
              <Input
                name="heavyMin"
                type="number"
                defaultValue={params.heavyMin ?? ""}
                min={1}
                max={10}
              />
            </label>
            <label className="block">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">
                Heavy ≤
              </span>
              <Input
                name="heavyMax"
                type="number"
                defaultValue={params.heavyMax ?? ""}
                min={1}
                max={10}
              />
            </label>
          </div>
          <label className="block">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">
              Min underground
            </span>
            <Input
              name="underMin"
              type="number"
              defaultValue={params.underMin ?? ""}
              min={1}
              max={10}
            />
          </label>
          <div className="lg:col-span-3 flex justify-end gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/bands">Reset</Link>
            </Button>
            <Button type="submit" size="sm" variant="spike">
              Apply
            </Button>
          </div>
        </form>
      </details>

      {countries.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground self-center">
            Quick country:
          </span>
          {countries.map((c) => (
            <Link
              key={c.countryCode}
              href={buildHref({ country: c.countryCode ?? undefined })}
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
          : "No bands match these filters."}
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
