import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getPerson(slug: string) {
  return db.person
    .findUnique({
      where: { slug },
      include: {
        bands: {
          include: {
            band: {
              select: {
                id: true,
                slug: true,
                name: true,
                countryCode: true,
                formedYear: true,
              },
            },
          },
          orderBy: [{ current: "desc" }, { fromYear: "asc" }],
        },
      },
    })
    .catch(() => null);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const p = await getPerson(slug);
  if (!p) return { title: "Person not found" };
  return {
    title: p.name,
    description:
      p.bio ?? `${p.name} — member of ${p.bands.length} band${p.bands.length === 1 ? "" : "s"}`,
  };
}

export default async function PersonPage({ params }: PageProps) {
  const { slug } = await params;
  const person = await getPerson(slug);
  if (!person) notFound();

  return (
    <div className="container py-10 md:py-14 max-w-3xl">
      <nav className="text-xs text-muted-foreground mb-6">
        <Link href="/people" className="hover:text-foreground">
          People
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{person.name}</span>
      </nav>

      <header className="mb-10">
        <h1 className="font-display text-5xl md:text-6xl tracking-tight">
          {person.name}
        </h1>
        <div className="flex gap-x-4 mt-3 text-sm text-muted-foreground">
          {person.countryCode && (
            <span className="font-mono">[{person.countryCode}]</span>
          )}
          {person.bornYear && <span>b. {person.bornYear}</span>}
        </div>
        {person.bio && (
          <p className="mt-6 max-w-2xl text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
            {person.bio}
          </p>
        )}
      </header>

      <h2 className="font-display text-2xl mb-4">Bands</h2>
      {person.bands.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">
          No band memberships catalogued.
        </p>
      ) : (
        <div className="space-y-2">
          {person.bands.map((m) => (
            <Link key={m.id} href={`/bands/${m.band.slug}`} className="block">
              <Card className="hover:border-primary/60 transition-colors">
                <CardContent className="py-3 flex items-baseline justify-between gap-3">
                  <div>
                    <p className="font-medium">{m.band.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.role.toLowerCase()}
                      {m.fromYear ? ` · ${m.fromYear}–${m.toYear ?? (m.current ? "now" : "?")}` : ""}
                    </p>
                  </div>
                  {m.current && <Badge variant="blood">current</Badge>}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
