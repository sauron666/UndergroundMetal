import type { Metadata } from "next";
import Link from "next/link";
import { search } from "@/server/search";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search } from "lucide-react";

export const metadata: Metadata = {
  title: "Search",
  description: "Search bands, articles, and concerts.",
};

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";

  const results = q
    ? await search(q, { limit: 10 }).catch(() => ({
        bands: [],
        articles: [],
        shows: [],
      }))
    : { bands: [], articles: [], shows: [] };

  return (
    <div className="container py-10 md:py-14 max-w-3xl">
      <h1 className="font-display text-4xl mb-6">Search</h1>
      <form action="/search" className="flex gap-2 mb-10">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input name="q" defaultValue={q} placeholder="Search bands, articles, concerts..." className="pl-9 h-12" />
        </div>
        <Button type="submit" variant="spike">Go</Button>
      </form>

      {q ? (
        <div className="space-y-10">
          <Section title={`Bands (${results.bands.length})`}>
            {results.bands.map((b) => (
              <Link key={b.id} href={`/bands/${b.slug}`} className="block">
                <Card className="hover:border-primary/60 transition-colors">
                  <CardContent className="py-3 flex justify-between items-baseline">
                    <div>
                      <p className="font-medium">{b.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        [{b.countryCode ?? "—"}]
                        {b.formedYear ? ` · ${b.formedYear}` : ""}
                      </p>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {b.rank.toFixed(2)}
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </Section>

          <Section title={`Articles (${results.articles.length})`}>
            {results.articles.map((a) => (
              <Link key={a.id} href={`/articles/${a.slug}`} className="block">
                <Card className="hover:border-primary/60 transition-colors">
                  <CardContent className="py-3">
                    <p className="font-medium">{a.title}</p>
                    {a.excerpt && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {a.excerpt}
                      </p>
                    )}
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
                      {a.type.toLowerCase()}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </Section>

          <Section title={`Concerts (${results.shows.length})`}>
            {results.shows.map((s) => (
              <Link key={s.id} href={`/concerts/${s.slug}`} className="block">
                <Card className="hover:border-primary/60 transition-colors">
                  <CardContent className="py-3">
                    <p className="font-medium">{s.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(s.date).toLocaleDateString()} · {s.city}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </Section>

          {results.bands.length + results.articles.length + results.shows.length === 0 && (
            <p className="text-muted-foreground text-sm italic">
              No matches. Try a different spelling or use AI Discovery for fuzzy band searches.
            </p>
          )}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">
          Search across the catalogue. Typos forgiven via trigram similarity;
          phrases ranked by Postgres full-text relevance.
        </p>
      )}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const items = Array.isArray(children) ? children : [children];
  if (items.filter(Boolean).length === 0) return null;
  return (
    <section>
      <h2 className="font-display text-xl mb-3">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
