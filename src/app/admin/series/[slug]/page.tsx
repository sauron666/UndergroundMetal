import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { SeriesForm } from "./form";
import { SeriesArticlesPanel } from "./articles-panel";

export default async function AdminSeriesEdit({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const series = await db.articleSeries.findUnique({
    where: { slug },
    include: {
      articles: {
        orderBy: [{ seriesPart: "asc" }, { publishedAt: "asc" }],
        select: {
          id: true,
          slug: true,
          title: true,
          status: true,
          seriesPart: true,
        },
      },
    },
  });
  if (!series) notFound();

  return (
    <div>
      <nav className="text-xs text-muted-foreground mb-4">
        <Link href="/admin/series" className="hover:text-foreground">
          Series
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{series.title}</span>
      </nav>
      <h1 className="font-display text-3xl mb-2">{series.title}</h1>
      <Link
        href={`/series/${series.slug}`}
        className="text-xs uppercase tracking-widest text-muted-foreground hover:text-primary mb-6 inline-block"
      >
        View public page →
      </Link>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        <SeriesForm
          series={{
            id: series.id,
            slug: series.slug,
            title: series.title,
            description: series.description,
            coverUrl: series.coverUrl,
          }}
        />
        <SeriesArticlesPanel
          seriesId={series.id}
          initial={series.articles.map((a) => ({
            id: a.id,
            slug: a.slug,
            title: a.title,
            status: a.status,
            seriesPart: a.seriesPart,
          }))}
        />
      </div>
    </div>
  );
}
