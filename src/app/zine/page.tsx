import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Zine",
  description:
    "The long-form section — features, interviews, deep-dive scene reports.",
};

export default async function ZinePage() {
  const articles = await db.article
    .findMany({
      where: {
        status: "PUBLISHED",
        type: { in: ["FEATURE", "INTERVIEW", "GUIDE"] },
      },
      include: {
        author: { select: { username: true, name: true } },
        bands: { include: { band: { select: { name: true, slug: true } } } },
      },
      orderBy: { publishedAt: "desc" },
      take: 30,
    })
    .catch(() => []);

  return (
    <div className="container py-10 md:py-14 max-w-4xl">
      <header className="mb-8">
        <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-2">
          ⛧ Zine
        </p>
        <h1 className="font-display text-5xl md:text-6xl tracking-tight">
          Long-form.
        </h1>
        <p className="text-muted-foreground mt-2 max-w-prose">
          Features, interviews and primer guides. The slow side of the
          editorial line.
        </p>
      </header>

      {articles.length === 0 ? (
        <p className="text-center text-muted-foreground italic py-20">
          Nothing in the zine yet.{" "}
          <Link href="/articles/new" className="text-primary">
            Pitch a feature →
          </Link>
        </p>
      ) : (
        <div className="space-y-4">
          {articles.map((a) => (
            <Link key={a.id} href={`/articles/${a.slug}`} className="block">
              <Card className="hover:border-primary/60 transition-colors">
                <CardHeader>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <Badge variant="rust">{a.type.toLowerCase()}</Badge>
                    {a.publishedAt && (
                      <span className="text-[10px] text-muted-foreground">
                        {formatDate(a.publishedAt)}
                      </span>
                    )}
                  </div>
                  <CardTitle className="text-2xl">{a.title}</CardTitle>
                  {a.subtitle && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {a.subtitle}
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  {a.excerpt && (
                    <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                      {a.excerpt}
                    </p>
                  )}
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    by {a.author.username ?? a.author.name ?? "anon"}
                    {a.bands.length > 0 && (
                      <>
                        {" "}
                        ·{" "}
                        {a.bands
                          .slice(0, 3)
                          .map((b) => b.band.name)
                          .join(", ")}
                      </>
                    )}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
