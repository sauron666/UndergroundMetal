import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, truncate } from "@/lib/utils";

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getSeries(slug: string) {
  return db.articleSeries
    .findUnique({
      where: { slug },
      include: {
        articles: {
          where: { status: "PUBLISHED" },
          orderBy: [{ seriesPart: "asc" }, { publishedAt: "asc" }],
          include: {
            author: { select: { username: true, name: true } },
          },
        },
      },
    })
    .catch(() => null);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const s = await getSeries(slug);
  if (!s) return { title: "Series not found" };
  return { title: s.title, description: s.description ?? undefined };
}

export default async function SeriesPage({ params }: PageProps) {
  const { slug } = await params;
  const series = await getSeries(slug);
  if (!series) notFound();

  return (
    <div className="container py-10 md:py-14 max-w-3xl">
      <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-2">
        ⛧ Series
      </p>
      <h1 className="font-display text-5xl md:text-6xl tracking-tight">
        {series.title}
      </h1>
      {series.description && (
        <p className="mt-4 text-muted-foreground max-w-prose whitespace-pre-line">
          {series.description}
        </p>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        {series.articles.length} part
        {series.articles.length === 1 ? "" : "s"}
      </p>

      <div className="space-y-3 mt-8">
        {series.articles.map((a) => (
          <Link key={a.id} href={`/articles/${a.slug}`} className="block">
            <Card className="hover:border-primary/60 transition-colors">
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  {a.seriesPart != null && (
                    <Badge variant="blood">Part {a.seriesPart}</Badge>
                  )}
                  <Badge variant="rust">{a.type.toLowerCase()}</Badge>
                  {a.publishedAt && (
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      {formatDate(a.publishedAt)}
                    </span>
                  )}
                </div>
                <CardTitle>{a.title}</CardTitle>
              </CardHeader>
              <CardContent>
                {a.excerpt && (
                  <p className="text-sm text-muted-foreground">
                    {truncate(a.excerpt, 200)}
                  </p>
                )}
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-2">
                  by {a.author.username ?? a.author.name ?? "anon"}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
