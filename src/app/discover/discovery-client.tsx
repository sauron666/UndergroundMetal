"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, ExternalLink, Skull, Flame, AlertTriangle, Loader2, Sparkles, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { toast } from "sonner";

type Reference = {
  kind: "metal-archives" | "musicbrainz" | "bandcamp" | "wikipedia" | "official" | "other";
  url: string;
  note?: string;
};

type Suggestion = {
  name: string;
  countryCode: string | null;
  formedYear: number | null;
  primaryGenre: string;
  subgenres: string[];
  themes: string[];
  heaviness: number;
  undergroundScore: number;
  rationale: string;
  references: Reference[];
  signatureRelease?: { title: string; year: number | null } | null;
  local?: { id: string; slug: string; name: string; imageUrl: string | null };
};

type Result = {
  query: string;
  interpretation: string;
  inferredTags: string[];
  mainstream: Suggestion[];
  underground: Suggestion[];
  skip: string[];
  cached?: boolean;
};

interface Filters {
  countryCodes: string[];
  minUnderground: number | null;
  heavinessMin: number;
  heavinessMax: number;
  yearFrom: number | null;
  yearTo: number | null;
}

const DEFAULT_FILTERS: Filters = {
  countryCodes: [],
  minUnderground: null,
  heavinessMin: 1,
  heavinessMax: 10,
  yearFrom: null,
  yearTo: null,
};

export function DiscoveryClient({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [query, setQuery] = useState(initialQuery);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [data, setData] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (q: string) => {
    if (!q.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        const apiFilters: Record<string, unknown> = {};
        if (filters.countryCodes.length > 0)
          apiFilters.countryCodes = filters.countryCodes;
        if (filters.minUnderground != null)
          apiFilters.minUnderground = filters.minUnderground;
        if (filters.heavinessMin > 1 || filters.heavinessMax < 10) {
          apiFilters.heaviness = {
            min: filters.heavinessMin,
            max: filters.heavinessMax,
          };
        }
        if (filters.yearFrom && filters.yearTo) {
          apiFilters.yearRange = {
            from: filters.yearFrom,
            to: filters.yearTo,
          };
        }
        const res = await fetch("/api/discover", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ query: q, filters: apiFilters }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error ?? `Request failed (${res.status})`);
        }
        const json = (await res.json()) as Result;
        setData(json);
        if (json.cached) toast.success("Served from cache");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Discovery failed";
        setError(msg);
        toast.error(msg);
      }
    });
  };

  useEffect(() => {
    if (initialQuery) run(initialQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  return (
    <div className="space-y-8">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const trimmed = query.trim();
          const sp = new URLSearchParams(params);
          if (trimmed) sp.set("q", trimmed);
          else sp.delete("q");
          router.replace(`/discover?${sp.toString()}`);
          run(trimmed);
        }}
        className="flex gap-2 items-center p-1 border border-border bg-card/60 rounded-sm ring-blood"
      >
        <Search className="ml-3 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Slavic atmospheric black metal with folk elements"
          className="border-0 bg-transparent focus-visible:ring-0 h-12"
          disabled={pending}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Filters"
          onClick={() => setShowFilters((s) => !s)}
        >
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
        <Button type="submit" variant="spike" size="lg" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Conjuring
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" /> Summon
            </>
          )}
        </Button>
      </form>

      {showFilters && (
        <div className="border border-border rounded-sm p-4 bg-card/40 space-y-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
              Country (ISO 2 codes, comma-separated)
            </p>
            <Input
              placeholder="BG, RO, GR"
              value={filters.countryCodes.join(", ")}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  countryCodes: e.target.value
                    .split(",")
                    .map((s) => s.trim().toUpperCase())
                    .filter((s) => s.length === 2),
                })
              }
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                Heaviness range: {filters.heavinessMin}–{filters.heavinessMax}/10
              </p>
              <div className="flex gap-2 items-center">
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={filters.heavinessMin}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setFilters({
                      ...filters,
                      heavinessMin: v,
                      heavinessMax: Math.max(v, filters.heavinessMax),
                    });
                  }}
                  className="flex-1 accent-primary"
                />
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={filters.heavinessMax}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setFilters({
                      ...filters,
                      heavinessMax: v,
                      heavinessMin: Math.min(filters.heavinessMin, v),
                    });
                  }}
                  className="flex-1 accent-primary"
                />
              </div>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                Min underground score: {filters.minUnderground ?? "none"}
              </p>
              <input
                type="range"
                min={0}
                max={10}
                value={filters.minUnderground ?? 0}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setFilters({
                    ...filters,
                    minUnderground: v === 0 ? null : v,
                  });
                }}
                className="w-full accent-primary"
              />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                Era from
              </p>
              <Input
                type="number"
                value={filters.yearFrom ?? ""}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    yearFrom: e.target.value ? Number(e.target.value) : null,
                  })
                }
                placeholder="e.g. 1985"
              />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                Era to
              </p>
              <Input
                type="number"
                value={filters.yearTo ?? ""}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    yearTo: e.target.value ? Number(e.target.value) : null,
                  })
                }
                placeholder="e.g. 2000"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setFilters(DEFAULT_FILTERS)}
            >
              Reset
            </Button>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 border border-destructive/40 bg-destructive/10 p-4 rounded-sm">
          <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
          <div className="text-sm">
            <p className="font-medium">{error}</p>
            {error.includes("ANTHROPIC_API_KEY") && (
              <p className="text-muted-foreground mt-1">
                Set <code>ANTHROPIC_API_KEY</code> in <code>.env</code> to
                enable AI discovery.
              </p>
            )}
          </div>
        </div>
      )}

      {data && (
        <div className="space-y-10">
          <div className="text-sm text-muted-foreground italic border-l-2 border-primary/60 pl-4">
            {data.interpretation}
            {data.inferredTags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {data.inferredTags.map((t) => (
                  <Badge key={t} variant="ghost">{t}</Badge>
                ))}
              </div>
            )}
          </div>

          <Tier
            title="Mainstream"
            subtitle="Likely on your radar already"
            icon={Flame}
            bands={data.mainstream}
          />
          <Tier
            title="Underground"
            subtitle="Dig in. Tape-traded, demo-only, regional gems."
            icon={Skull}
            bands={data.underground}
            highlight
          />
        </div>
      )}

      {!data && !pending && !error && (
        <div className="text-center py-16 text-muted-foreground text-sm">
          Enter a query above to summon the underground.
        </div>
      )}
    </div>
  );
}

function Tier({
  title,
  subtitle,
  icon: Icon,
  bands,
  highlight,
}: {
  title: string;
  subtitle: string;
  icon: typeof Skull;
  bands: Suggestion[];
  highlight?: boolean;
}) {
  if (!bands.length) return null;
  return (
    <section>
      <div className="flex items-end justify-between mb-4">
        <div>
          <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-primary">
            <Icon className="h-3.5 w-3.5" /> {title}
          </p>
          <h2 className="font-display text-2xl mt-1">{subtitle}</h2>
        </div>
        <span className="text-xs text-muted-foreground">{bands.length}</span>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {bands.map((b) => (
          <BandCard key={`${title}-${b.name}`} band={b} highlight={highlight} />
        ))}
      </div>
    </section>
  );
}

function BandCard({ band, highlight }: { band: Suggestion; highlight?: boolean }) {
  return (
    <Card className={highlight ? "hover:border-primary transition-colors" : "hover:border-primary/60 transition-colors"}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            {band.local ? (
              <Link
                href={`/bands/${band.local.slug}`}
                className="font-display text-xl hover:text-primary transition-colors"
              >
                {band.name}
              </Link>
            ) : (
              <span className="font-display text-xl">{band.name}</span>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {band.countryCode && (
                <span className="font-mono">[{band.countryCode}]</span>
              )}{" "}
              {band.formedYear ? `· est. ${band.formedYear}` : ""}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 text-[10px] text-muted-foreground font-mono">
            <span title="Heaviness">⚡ {band.heaviness}/10</span>
            <span title="Underground score">⛧ {band.undergroundScore}/10</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="blood">{band.primaryGenre}</Badge>
          {band.subgenres.slice(0, 3).map((g) => (
            <Badge key={g} variant="outline">{g}</Badge>
          ))}
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {band.rationale}
        </p>
        {band.signatureRelease && (
          <p className="text-xs">
            <span className="text-muted-foreground">Start with: </span>
            <span className="text-foreground italic">
              {band.signatureRelease.title}
              {band.signatureRelease.year ? ` (${band.signatureRelease.year})` : ""}
            </span>
          </p>
        )}
        {band.references.length > 0 && (
          <div className="pt-2 border-t border-border/60 flex flex-wrap gap-2">
            {band.references.slice(0, 4).map((r, i) => (
              <a
                key={i}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-primary"
              >
                <ExternalLink className="h-3 w-3" /> {r.kind}
              </a>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
