import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
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

  const [bands, articles, shows] = q
    ? await Promise.all([
        db.band
          .findMany({
            where: { name: { contains: q, mode: "insensitive" } },
            take: 10,
            select: { slug: true, name: true, countryCode: true, formedYear: true },
          })
          .catch(() => []),
        db.article
          .findMany({
            where: {
              status: "PUBLISHED",
              OR: [
                { title: { contains: q, mode: "insensitive" } },
                { contentText: { contains: q, mode: "insensitive" } },
              ],
            },
            take: 10,
            select: { slug: true, title: true, type: true, publishedAt: true },
          })
          .catch(() => []),
        db.show
          .findMany({
            where: {
              date: { gte: new Date() },
              OR: [
                { title: { contains: q, mode: "insensitive" } },
                { venue: { city: { contains: q, mode: "insensitive" } } },
              ],
            },
            take: 10,
            include: { venue: true },
          })
          .catch(() => []),
      ])
    : [[], [], []];

  return (
    <div className="container py-10 md:py-14 max-w-3xl">
      <h1 className="font-display text-4xl mb-6">Search</h1>
      <form action="/search" className="flex gap-2 mb-10">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input name="q" defaultValue={q} placeholder="Search..." className="pl-9 h-12" />
        </div>
        <Button type="submit" variant="spike">
          Go
        </Button>
      </form>

      {q ? (
        <div className="space-y-10">
          <Section title={`Bands (${bands.length})`}>
            {bands.map((b) => (
              <Link key={b.slug} href={`/bands/${b.slug}`} className="block">
                <Card className="hover:border-primary/60 transition-colors">
                  <CardContent className="py-3">
                    <p className="font-medium">{b.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      [{b.countryCode ?? "—"}]{" "}
                      {b.formedYear ? `· ${b.formedYear}` : ""}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </Section>
          <Section title={`Articles (${articles.length})`}>
            {articles.map((a) => (
              <Link key={a.slug} href={`/articles/${a.slug}`} className="block">
                <Card className="hover:border-primary/60 transition-colors">
                  <CardContent className="py-3">
                    <p className="font-medium">{a.title}</p>
                    <p className="text-xs text-muted-foreground uppercase tracking-widest">
                      {a.type.toLowerCase()}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </Section>
          <Section title={`Concerts (${shows.length})`}>
            {shows.map((s) => (
              <Link key={s.slug} href={`/concerts/${s.slug}`} className="block">
                <Card className="hover:border-primary/60 transition-colors">
                  <CardContent className="py-3">
                    <p className="font-medium">{s.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(s.date).toLocaleDateString()} ·{" "}
                      {s.venue.name}, {s.venue.city}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </Section>
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">
          Enter a term to search bands, articles, and concerts.
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
