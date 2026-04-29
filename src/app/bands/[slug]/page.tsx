import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, MapPin, Calendar, Disc, Skull } from "lucide-react";

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getBand(slug: string) {
  return db.band
    .findUnique({
      where: { slug },
      include: {
        genres: { include: { genre: true } },
        members: { include: { person: true } },
        releases: { orderBy: [{ year: "asc" }, { releaseDate: "asc" }] },
        sources: true,
        articles: {
          include: {
            article: {
              select: { id: true, slug: true, title: true, type: true, publishedAt: true, status: true },
            },
          },
        },
        shows: {
          include: { show: { include: { venue: true } } },
          orderBy: [{ show: { date: "desc" } }],
          take: 8,
        },
      },
    })
    .catch(() => null);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const band = await getBand(slug);
  if (!band) return { title: "Band not found" };
  return {
    title: band.name,
    description:
      band.bio ??
      `${band.name} — ${band.genres.map((g) => g.genre.name).join(", ")}${
        band.countryCode ? ` from ${band.countryCode}` : ""
      }.`,
  };
}

export default async function BandPage({ params }: PageProps) {
  const { slug } = await params;
  const band = await getBand(slug);
  if (!band) notFound();

  return (
    <div className="container py-10 md:py-14">
      <nav className="text-xs text-muted-foreground mb-6">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/bands" className="hover:text-foreground">Bands</Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{band.name}</span>
      </nav>

      <header className="mb-10 grid md:grid-cols-[1fr_280px] gap-8 items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {band.verified && <Badge variant="blood">Verified</Badge>}
            <Badge variant="outline">
              {band.status.replace("_", " ").toLowerCase()}
            </Badge>
          </div>
          <h1 className="font-display text-5xl md:text-6xl tracking-tight text-shadow-blood">
            {band.name}
          </h1>
          <div className="flex flex-wrap gap-x-5 gap-y-2 mt-3 text-sm text-muted-foreground">
            {band.countryCode && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" /> {band.countryCode}
                {band.city ? ` · ${band.city}` : ""}
              </span>
            )}
            {band.formedYear && (
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> formed {band.formedYear}
                {band.endedYear ? ` – ${band.endedYear}` : ""}
              </span>
            )}
          </div>
          {band.genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-5">
              {band.genres.map((g) => (
                <Badge key={g.genreId} variant="rust">{g.genre.name}</Badge>
              ))}
            </div>
          )}
          {band.themes.length > 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              <span className="uppercase tracking-widest">Themes:</span>{" "}
              {band.themes.join(" · ")}
            </p>
          )}
          {band.bio && (
            <p className="mt-6 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {band.bio}
            </p>
          )}
          <div className="mt-6 flex flex-wrap gap-2">
            <Button variant="outline" size="sm">Follow</Button>
            <Button variant="ghost" size="sm">Bookmark</Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Skull className="h-4 w-4 text-primary" /> Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Stat label="Heaviness" value={`${band.heaviness}/10`} />
            <Stat label="Underground" value={`${band.undergroundScore}/10`} />
            <Stat label="Releases" value={band.releases.length} />
            <Stat label="Members" value={band.members.length} />
            {band.sources.length > 0 && (
              <div className="pt-3 border-t border-border/60">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                  Sources
                </p>
                <ul className="space-y-1.5">
                  {band.sources.map((s) => (
                    <li key={s.id}>
                      <a
                        href={s.url ?? "#"}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                      >
                        <ExternalLink className="h-3 w-3" />{" "}
                        {s.type.replace("_", " ").toLowerCase()}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </header>

      <Section
        title="Discography"
        icon={Disc}
        empty="No releases catalogued yet."
        items={band.releases}
        render={(r) => (
          <div className="flex justify-between items-baseline border-b border-border/40 py-3">
            <div>
              <p className="font-medium">{r.title}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-widest">
                {r.type.replace("_", " ").toLowerCase()} · {r.year ?? "?"}
              </p>
            </div>
            {r.bandcampUrl && (
              <a
                href={r.bandcampUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="text-xs text-muted-foreground hover:text-primary"
              >
                Bandcamp →
              </a>
            )}
          </div>
        )}
      />

      <Section
        title="Members"
        icon={Skull}
        empty="No members listed."
        items={band.members}
        render={(m) => (
          <div className="flex justify-between items-baseline border-b border-border/40 py-3">
            <div>
              <p className="font-medium">{m.person.name}</p>
              <p className="text-xs text-muted-foreground">
                {m.role.toLowerCase()} · {m.current ? "current" : "former"}
                {m.fromYear ? ` · ${m.fromYear}–${m.toYear ?? "now"}` : ""}
              </p>
            </div>
          </div>
        )}
      />

      {band.shows.length > 0 && (
        <Section
          title="Shows"
          icon={Calendar}
          empty=""
          items={band.shows}
          render={(s) => (
            <div className="flex justify-between items-baseline border-b border-border/40 py-3">
              <div>
                <p className="font-medium">{s.show.title}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(s.show.date).toLocaleDateString()} ·{" "}
                  {s.show.venue.name}, {s.show.venue.city}
                </p>
              </div>
              <Link
                href={`/concerts/${s.show.slug}`}
                className="text-xs text-muted-foreground hover:text-primary"
              >
                Details →
              </Link>
            </div>
          )}
        />
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}

function Section<T>({
  title,
  icon: Icon,
  items,
  render,
  empty,
}: {
  title: string;
  icon: typeof Skull;
  items: T[];
  render: (item: T) => React.ReactNode;
  empty: string;
}) {
  return (
    <section className="mt-12">
      <h2 className="font-display text-2xl mb-4 flex items-center gap-2">
        <Icon className="h-5 w-5 text-primary" /> {title}
      </h2>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">{empty}</p>
      ) : (
        <div>{items.map((it, i) => <div key={i}>{render(it)}</div>)}</div>
      )}
    </section>
  );
}
