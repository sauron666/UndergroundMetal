import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Bulgarian Metal Archive",
  description:
    "An open archive of Bulgarian rock and metal — from late-Soviet era pioneers to modern underground demos.",
};

export default async function BgArchivePage() {
  const bands = await db.band
    .findMany({
      where: { countryCode: "BG" },
      include: { genres: { include: { genre: true } } },
      orderBy: [{ undergroundScore: "desc" }, { name: "asc" }],
      take: 200,
    })
    .catch(() => []);

  type BandRow = (typeof bands)[number];
  const byDecade = new Map<string, BandRow[]>();
  for (const b of bands) {
    const decade = b.formedYear
      ? `${Math.floor(b.formedYear / 10) * 10}s`
      : "Unknown";
    if (!byDecade.has(decade)) byDecade.set(decade, []);
    byDecade.get(decade)!.push(b);
  }
  const decades = Array.from(byDecade.entries()).sort((a, b) =>
    a[0] === "Unknown" ? 1 : b[0] === "Unknown" ? -1 : a[0].localeCompare(b[0])
  );

  return (
    <div className="container py-10 md:py-14">
      <header className="mb-10 max-w-3xl">
        <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-2">
          ⛧ Bulgarian Archive
        </p>
        <h1 className="font-display text-5xl md:text-6xl tracking-tight">
          Българската метъл сцена
        </h1>
        <p className="mt-4 text-muted-foreground">
          Архив на българския рок и метъл &mdash; от пионерите в края на 70-те и
          80-те през 90-те underground демота до съвременните независими
          проекти. Помогнете ни да го попълним: ако знаете група която липсва,
          добавете я.
        </p>
        <div className="mt-6 flex gap-2">
          <Button asChild variant="spike">
            <Link href="/bands/new">Add a band</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/discover?q=Bulgarian+underground+metal">
              AI Discovery
            </Link>
          </Button>
        </div>
      </header>

      {bands.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-sm">
          <p className="text-muted-foreground">
            Архивът е празен. Стартирайте seed скрипта или добавете групи ръчно.
          </p>
        </div>
      ) : (
        <div className="space-y-12">
          {decades.map(([decade, list]) => (
            <section key={decade}>
              <h2 className="font-display text-3xl mb-4">{decade}</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {list.map((b) => (
                  <Link key={b.id} href={`/bands/${b.slug}`} className="group">
                    <Card className="hover:border-primary/60 transition-colors">
                      <CardHeader>
                        <CardTitle className="text-lg group-hover:text-primary transition-colors">
                          {b.name}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">
                          {b.city ?? "—"}
                          {b.formedYear ? ` · ${b.formedYear}` : ""}
                        </p>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-1.5">
                          {b.genres.slice(0, 3).map((g) => (
                            <Badge key={g.genreId} variant="outline">
                              {g.genre.name}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
