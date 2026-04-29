import type { Metadata } from "next";
import Link from "next/link";
import { trendingBands, trendingArticles, type Window } from "@/server/trending";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Flame, MessageSquare, ArrowBigUp } from "lucide-react";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Trending",
  description: "Bands gaining followers and articles gathering steam.",
};

const WINDOWS: { value: Window; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "all", label: "All time" },
];

interface PageProps {
  searchParams: Promise<{ w?: string }>;
}

export default async function TrendingPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const window: Window =
    params.w === "30d" || params.w === "all" ? params.w : "7d";

  const [bands, articles] = await Promise.all([
    trendingBands(window, 12).catch(() => []),
    trendingArticles(window, 10).catch(() => []),
  ]);

  return (
    <div className="container py-10 md:py-14 max-w-5xl">
      <header className="flex items-end justify-between mb-8 gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-2 flex items-center gap-1.5">
            <TrendingUp className="h-3 w-3" /> Trending
          </p>
          <h1 className="font-display text-4xl md:text-5xl">What&apos;s rising.</h1>
        </div>
        <div className="flex gap-2">
          {WINDOWS.map((w) => (
            <Link
              key={w.value}
              href={`/trending?w=${w.value}`}
              className={
                window === w.value
                  ? "px-3 py-1.5 text-[10px] uppercase tracking-widest bg-primary/15 text-primary border border-primary/30 rounded-sm"
                  : "px-3 py-1.5 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground border border-border rounded-sm"
              }
            >
              {w.label}
            </Link>
          ))}
        </div>
      </header>

      <section className="mb-12">
        <h2 className="font-display text-2xl mb-4 flex items-center gap-2">
          <Flame className="h-5 w-5 text-primary" /> Bands
        </h2>
        {bands.length === 0 ? (
          <p className="text-muted-foreground italic text-sm">
            Not enough activity in this window yet.
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {bands.map((b, i) => (
              <Link key={b.id} href={`/bands/${b.slug}`} className="group">
                <Card className="hover:border-primary/60 transition-colors h-full">
                  <CardHeader>
                    <div className="flex items-baseline justify-between">
                      <CardTitle className="text-lg group-hover:text-primary transition-colors">
                        {b.name}
                      </CardTitle>
                      <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
                        #{i + 1}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono">
                      [{b.countryCode ?? "—"}]
                      {b.formedYear ? ` · ${b.formedYear}` : ""}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {b.genres.slice(0, 2).map((g) => (
                        <Badge key={g.genreId} variant="outline">
                          {g.genre.name}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
                      +{b.recentFollows} follow{b.recentFollows === 1 ? "" : "s"} ·
                      ⛧ {b.undergroundScore}/10
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-display text-2xl mb-4 flex items-center gap-2">
          <ArrowBigUp className="h-5 w-5 text-primary" /> Articles
        </h2>
        {articles.length === 0 ? (
          <p className="text-muted-foreground italic text-sm">
            No articles in this window yet.
          </p>
        ) : (
          <div className="space-y-2">
            {articles.map((a, i) => (
              <Link key={a.id} href={`/articles/${a.slug}`} className="block">
                <Card className="hover:border-primary/60 transition-colors">
                  <CardContent className="py-3 flex items-center gap-4">
                    <span className="text-2xl font-display text-muted-foreground font-mono w-10 text-right">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="rust">{a.type.toLowerCase()}</Badge>
                        {a.rating != null && (
                          <Badge variant="blood">{a.rating}/100</Badge>
                        )}
                        <span className="text-[10px] text-muted-foreground ml-auto">
                          {a.publishedAt ? formatDate(a.publishedAt) : ""}
                        </span>
                      </div>
                      <p className="font-medium truncate">{a.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3">
                        <span>by {a.author.username ?? a.author.name ?? "anon"}</span>
                        <span className="inline-flex items-center gap-1">
                          <ArrowBigUp className="h-3 w-3" /> {a.score >= 0 ? `+${a.score}` : a.score}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" /> {a._count.comments}
                        </span>
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
