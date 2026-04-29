import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getList(slug: string) {
  return db.bandList
    .findUnique({
      where: { slug },
      include: {
        curator: { select: { username: true, name: true } },
        items: {
          orderBy: { position: "asc" },
          include: {
            band: {
              select: {
                id: true,
                slug: true,
                name: true,
                countryCode: true,
                formedYear: true,
                heaviness: true,
                undergroundScore: true,
                genres: { include: { genre: true }, take: 3 },
              },
            },
          },
        },
      },
    })
    .catch(() => null);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const l = await getList(slug);
  if (!l) return { title: "List not found" };
  return {
    title: l.title,
    description: l.description ?? `${l.items.length} bands curated by ${l.curator.username ?? l.curator.name ?? "an editor"}.`,
  };
}

export default async function ListPage({ params }: PageProps) {
  const { slug } = await params;
  const list = await getList(slug);
  if (!list || !list.published) notFound();

  return (
    <div className="container py-10 md:py-14 max-w-4xl">
      <nav className="text-xs text-muted-foreground mb-4">
        <Link href="/lists" className="hover:text-foreground">
          Lists
        </Link>
        <span className="mx-2">/</span>
        <Badge variant="outline">{list.kind.replace("_", " ").toLowerCase()}</Badge>
      </nav>

      <header className="mb-10">
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="rust">{list.kind.replace("_", " ").toLowerCase()}</Badge>
          {list.year && <Badge variant="outline">{list.year}</Badge>}
        </div>
        <h1 className="font-display text-4xl md:text-6xl tracking-tight">
          {list.title}
        </h1>
        {list.description && (
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl leading-relaxed whitespace-pre-line">
            {list.description}
          </p>
        )}
        <p className="mt-4 text-xs text-muted-foreground">
          curated by{" "}
          {list.curator.username ? (
            <Link
              href={`/u/${list.curator.username}`}
              className="text-foreground font-medium hover:text-primary"
            >
              {list.curator.username}
            </Link>
          ) : (
            <span className="text-foreground font-medium">
              {list.curator.name ?? "anon"}
            </span>
          )}{" "}
          {list.publishedAt && <>· {formatDate(list.publishedAt)}</>} ·{" "}
          {list.items.length} band{list.items.length === 1 ? "" : "s"}
        </p>
      </header>

      <ol className="space-y-3">
        {list.items.map((it, i) => (
          <li key={it.bandId}>
            <Card className="hover:border-primary/60 transition-colors">
              <CardContent className="py-4 flex items-start gap-4">
                <span className="font-blackletter text-4xl text-primary shrink-0 w-12 text-center">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/bands/${it.band.slug}`}
                    className="font-display text-2xl hover:text-primary"
                  >
                    {it.band.name}
                  </Link>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">
                    [{it.band.countryCode ?? "—"}]
                    {it.band.formedYear ? ` · ${it.band.formedYear}` : ""} · ⚡{" "}
                    {it.band.heaviness}/10 · ⛧ {it.band.undergroundScore}/10
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {it.band.genres.map((g) => (
                      <Badge key={g.genreId} variant="outline">
                        {g.genre.name}
                      </Badge>
                    ))}
                  </div>
                  {it.note && (
                    <p className="mt-3 text-sm text-muted-foreground leading-relaxed border-l-2 border-primary/40 pl-3 italic">
                      {it.note}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ol>
    </div>
  );
}
