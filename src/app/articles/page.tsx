import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, truncate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Articles",
  description:
    "Reviews, interviews, news, and features — every piece sourced and editor-checked.",
};

interface PageProps {
  searchParams: Promise<{ type?: string }>;
}

export default async function ArticlesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const articles = await db.article
    .findMany({
      where: {
        status: "PUBLISHED",
        ...(params.type ? { type: params.type as never } : {}),
      },
      include: {
        author: { select: { username: true, name: true } },
        bands: { include: { band: { select: { name: true, slug: true } } } },
        _count: { select: { citations: true } },
      },
      orderBy: { publishedAt: "desc" },
      take: 30,
    })
    .catch(() => []);

  const types = ["NEWS", "REVIEW", "INTERVIEW", "FEATURE", "OPINION", "GUIDE"];

  return (
    <div className="container py-10 md:py-14">
      <header className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-2">
            ⛧ Editorial
          </p>
          <h1 className="font-display text-4xl md:text-5xl">Articles</h1>
        </div>
        <Button asChild variant="spike">
          <Link href="/articles/new">Pitch a piece</Link>
        </Button>
      </header>

      <div className="flex flex-wrap gap-2 mb-8">
        <Link
          href="/articles"
          className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-primary"
        >
          All
        </Link>
        {types.map((t) => (
          <Link
            key={t}
            href={`/articles?type=${t}`}
            className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-primary"
          >
            {t.toLowerCase()}
          </Link>
        ))}
      </div>

      {articles.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border rounded-sm">
          <p className="font-display text-2xl mb-2">Nothing published yet.</p>
          <p className="text-sm text-muted-foreground">
            Be the first to pitch.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {articles.map((a) => (
            <Link key={a.id} href={`/articles/${a.slug}`} className="group">
              <Card className="h-full hover:border-primary/60 transition-colors">
                <CardHeader>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <Badge variant="rust">{a.type.toLowerCase()}</Badge>
                    {a.rating != null && (
                      <Badge variant="blood">{a.rating}/100</Badge>
                    )}
                  </div>
                  <CardTitle className="group-hover:text-primary transition-colors">
                    {a.title}
                  </CardTitle>
                  {a.subtitle && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {a.subtitle}
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  {a.excerpt && (
                    <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                      {truncate(a.excerpt, 140)}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
                    <span>
                      by {a.author.username ?? a.author.name ?? "anon"}
                    </span>
                    <span>
                      {a.publishedAt ? formatDate(a.publishedAt) : "—"} ·{" "}
                      {a._count.citations} src
                    </span>
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
