/**
 * Print-friendly article view. Stripped of site chrome, set in serif at print
 * sizes with footnoted citations. Users hit Cmd+P / Ctrl+P (or the Save as PDF
 * button) to export. We deliberately avoid a server-side PDF dep — the
 * browser's print pipeline is more flexible, multilingual, and zero-runtime.
 */

import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { ArticleBody } from "../article-body";
import { formatDate } from "@/lib/utils";
import { PrintButton } from "./print-button";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function PrintArticle({ params }: PageProps) {
  const { slug } = await params;
  const article = await db.article
    .findUnique({
      where: { slug },
      include: {
        author: { select: { username: true, name: true } },
        bands: { include: { band: { select: { name: true, slug: true } } } },
        citations: true,
      },
    })
    .catch(() => null);
  if (!article || article.status !== "PUBLISHED") notFound();

  return (
    <div className="bg-background text-foreground min-h-screen">
      <style>{`
        @page { margin: 18mm 16mm; }
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
          a { color: black !important; text-decoration: underline; }
          .print-shell { color: black !important; }
        }
        .print-shell h1, .print-shell h2, .print-shell h3 {
          page-break-after: avoid;
        }
        .print-shell p, .print-shell li { orphans: 3; widows: 3; }
      `}</style>

      <div className="no-print sticky top-0 z-10 bg-background border-b border-border/60">
        <div className="container py-3 flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Print preview · use your browser's <kbd>Save as PDF</kbd>
          </p>
          <PrintButton />
        </div>
      </div>

      <article className="print-shell container py-12 max-w-[700px] font-display">
        <p className="text-xs uppercase tracking-[0.3em] mb-3">
          {article.type.replace("_", " ").toLowerCase()}
        </p>
        <h1 className="text-4xl mb-3 leading-tight">{article.title}</h1>
        {article.subtitle && (
          <p className="text-lg italic mb-6">{article.subtitle}</p>
        )}
        <p className="text-xs mb-8 border-y border-current/30 py-2 font-sans">
          by {article.author.username ?? article.author.name ?? "anon"}
          {article.publishedAt && <> · {formatDate(article.publishedAt)}</>}
          {article.rating != null && <> · {article.rating}/100</>}
          {article.bands.length > 0 && (
            <> · {article.bands.map((b) => b.band.name).join(", ")}</>
          )}
        </p>

        <div className="prose font-sans text-[15px] leading-relaxed">
          <ArticleBody content={article.content} />
        </div>

        {article.citations.length > 0 && (
          <section className="mt-10 pt-6 border-t border-current/30 font-sans">
            <h2 className="text-base uppercase tracking-widest mb-3">
              Sources
            </h2>
            <ol className="text-xs space-y-1.5 list-decimal list-inside">
              {article.citations.map((c) => (
                <li key={c.id}>
                  {c.title ? `${c.title}. ` : ""}
                  {c.publisher ? `${c.publisher}. ` : ""}
                  <span className="break-all">{c.url}</span>
                  {c.archiveUrl && (
                    <>
                      {" "}
                      (archive: <span className="break-all">{c.archiveUrl}</span>)
                    </>
                  )}
                </li>
              ))}
            </ol>
          </section>
        )}
      </article>
    </div>
  );
}
