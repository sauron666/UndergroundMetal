import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate, truncate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Articles",
  description:
    "Reviews, interviews, news, and features — every piece sourced and editor-checked.",
};

interface PageProps {
  searchParams: Promise<{
    type?: string;
    q?: string;
    band?: string;
    minRating?: string;
    sort?: string;
    page?: string;
  }>;
}

const TYPES = [
  "NEWS",
  "REVIEW",
  "INTERVIEW",
  "FEATURE",
  "OPINION",
  "GUIDE",
] as const;

const SORTS = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "top", label: "Top rated" },
  { value: "popular", label: "Most discussed" },
] as const;

const PAGE_SIZE = 30;

export default async function ArticlesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const sort = (SORTS.find((s) => s.value === params.sort)?.value ??
    "newest") as (typeof SORTS)[number]["value"];
  const minRating = params.minRating ? Number(params.minRating) : null;
  const page = Math.max(1, Number(params.page ?? 1));

  const where = {
    status: "PUBLISHED" as const,
    ...(params.type && TYPES.includes(params.type as (typeof TYPES)[number])
      ? { type: params.type as never }
      : {}),
    ...(params.q
      ? {
          OR: [
            { title: { contains: params.q, mode: "insensitive" as const } },
            { contentText: { contains: params.q, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(params.band
      ? { bands: { some: { band: { slug: params.band } } } }
      : {}),
    ...(minRating != null ? { rating: { gte: minRating } } : {}),
  };

  const orderBy =
    sort === "oldest"
      ? [{ publishedAt: "asc" as const }]
      : sort === "top"
      ? [{ rating: "desc" as const }, { publishedAt: "desc" as const }]
      : sort === "popular"
      ? [{ comments: { _count: "desc" as const } }, { publishedAt: "desc" as const }]
      : [{ publishedAt: "desc" as const }];

  const [articles, total] = await Promise.all([
    db.article
      .findMany({
        where,
        include: {
          author: { select: { username: true, name: true } },
          bands: { include: { band: { select: { name: true, slug: true } } } },
          _count: { select: { citations: true, comments: true } },
        },
        orderBy,
        take: PAGE_SIZE,
        skip: (page - 1) * PAGE_SIZE,
      })
      .catch(() => []),
    db.article.count({ where }).catch(() => 0),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const buildHref = (overrides: Record<string, string | undefined>) => {
    const sp = new URLSearchParams();
    const merged = { ...params, ...overrides } as Record<string, string | undefined>;
    Object.entries(merged).forEach(([k, v]) => {
      if (v != null && v !== "") sp.set(k, String(v));
    });
    const qs = sp.toString();
    return qs ? `/articles?${qs}` : "/articles";
  };

  return (
    <div className="container py-10 md:py-14">
      <header className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-2">
            ⛧ Editorial
          </p>
          <h1 className="font-display text-4xl md:text-5xl">Articles</h1>
          <p className="text-muted-foreground mt-2">
            {total.toLocaleString()} published · sorted by{" "}
            {SORTS.find((s) => s.value === sort)?.label.toLowerCase()}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <form action="/articles" className="flex gap-2">
            {Object.entries(params)
              .filter(([k]) => k !== "q" && k !== "page")
              .map(([k, v]) =>
                v == null || v === "" ? null : (
                  <input key={k} type="hidden" name={k} value={String(v)} />
                )
              )}
            <Input
              name="q"
              defaultValue={params.q ?? ""}
              placeholder="Search articles..."
              className="w-56"
            />
            <Button type="submit" size="sm" variant="outline">
              Search
            </Button>
          </form>
          <Button asChild variant="spike">
            <Link href="/articles/new">Pitch</Link>
          </Button>
        </div>
      </header>

      {/* Type tabs */}
      <div className="flex flex-wrap gap-2 mb-3">
        <Link
          href={buildHref({ type: undefined, page: undefined })}
          className={
            !params.type
              ? "text-[10px] uppercase tracking-widest text-primary"
              : "text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
          }
        >
          All
        </Link>
        {TYPES.map((t) => (
          <Link
            key={t}
            href={buildHref({ type: t, page: undefined })}
            className={
              params.type === t
                ? "text-[10px] uppercase tracking-widest text-primary"
                : "text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
            }
          >
            {t.toLowerCase()}
          </Link>
        ))}
      </div>

      {/* Sort + min rating + band filter chip */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 mb-8 text-[10px] uppercase tracking-widest text-muted-foreground items-center">
        <span>Sort:</span>
        {SORTS.map((s) => (
          <Link
            key={s.value}
            href={buildHref({ sort: s.value, page: undefined })}
            className={
              sort === s.value
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }
          >
            {s.label}
          </Link>
        ))}
        <span className="ml-3">Min rating:</span>
        {[null, 50, 70, 85].map((r) => (
          <Link
            key={String(r)}
            href={buildHref({
              minRating: r != null ? String(r) : undefined,
              page: undefined,
            })}
            className={
              (minRating ?? null) === r
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }
          >
            {r == null ? "Any" : `≥${r}`}
          </Link>
        ))}
        {params.band && (
          <span className="ml-3 inline-flex items-center gap-1">
            band: <span className="text-foreground">{params.band}</span>
            <Link
              href={buildHref({ band: undefined, page: undefined })}
              className="text-muted-foreground hover:text-destructive"
            >
              ×
            </Link>
          </span>
        )}
      </div>

      {articles.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border rounded-sm">
          <p className="font-display text-2xl mb-2">Nothing published yet.</p>
          <p className="text-sm text-muted-foreground">
            Adjust filters or be the first to pitch.
          </p>
        </div>
      ) : (
        <>
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
                      <span>by {a.author.username ?? a.author.name ?? "anon"}</span>
                      <span>
                        {a.publishedAt ? formatDate(a.publishedAt) : "—"} ·{" "}
                        {a._count.citations} src · {a._count.comments} cmt
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <nav className="flex justify-center gap-2 mt-10 text-xs uppercase tracking-widest">
              {page > 1 && (
                <Link
                  href={buildHref({ page: String(page - 1) })}
                  className="px-3 py-1.5 border border-border rounded-sm hover:border-primary"
                >
                  ← Prev
                </Link>
              )}
              <span className="px-3 py-1.5 text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              {page < totalPages && (
                <Link
                  href={buildHref({ page: String(page + 1) })}
                  className="px-3 py-1.5 border border-border rounded-sm hover:border-primary"
                >
                  Next →
                </Link>
              )}
            </nav>
          )}
        </>
      )}
    </div>
  );
}
