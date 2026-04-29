import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BandcampEmbed } from "@/components/embeds/bandcamp";
import { SpotifyEmbed } from "@/components/embeds/spotify";
import { ReleaseRating } from "@/components/releases/release-rating";
import { Disc, Calendar } from "lucide-react";

interface PageProps {
  params: Promise<{ slug: string; releaseId: string }>;
}

async function getRelease(bandSlug: string, releaseId: string) {
  return db.release
    .findFirst({
      where: { id: releaseId, band: { slug: bandSlug } },
      include: {
        band: { select: { slug: true, name: true, countryCode: true } },
      },
    })
    .catch(() => null);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, releaseId } = await params;
  const r = await getRelease(slug, releaseId);
  if (!r) return { title: "Release not found" };
  return {
    title: `${r.band.name} — ${r.title}`,
    description:
      r.description ??
      `${r.band.name} · ${r.type.replace("_", " ").toLowerCase()}${r.year ? ` (${r.year})` : ""}`,
  };
}

function bandcampIdFromUrl(url: string | null): string | null {
  if (!url) return null;
  // Match numeric album/track id in standard embed URLs
  const m = url.match(/(?:album|track)=(\d+)/);
  if (m) return m[1];
  return null;
}

export default async function ReleasePage({ params }: PageProps) {
  const { slug, releaseId } = await params;
  const release = await getRelease(slug, releaseId);
  if (!release) notFound();

  const session = await auth();
  const userId = session?.user?.id ?? null;

  const [ratingAggregate, myRating] = await Promise.all([
    db.releaseRating
      .aggregate({
        where: { releaseId: release.id },
        _avg: { value: true },
        _count: true,
      })
      .catch(() => null),
    userId
      ? db.releaseRating
          .findUnique({
            where: { releaseId_userId: { releaseId: release.id, userId } },
          })
          .catch(() => null)
      : null,
  ]);

  const bandcampAlbumId =
    release.bandcampUrl?.includes("EmbeddedPlayer")
      ? bandcampIdFromUrl(release.bandcampUrl)
      : null;

  const avgRating = ratingAggregate?._avg.value ?? null;
  const ratingCount = ratingAggregate?._count ?? 0;

  return (
    <div className="container py-10 md:py-14 max-w-3xl">
      <nav className="text-xs text-muted-foreground mb-4">
        <Link href={`/bands/${release.band.slug}`} className="hover:text-foreground">
          {release.band.name}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{release.title}</span>
      </nav>

      <header className="mb-8 grid md:grid-cols-[200px_1fr] gap-6">
        {release.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={release.coverUrl}
            alt={release.title}
            className="w-full max-w-[200px] aspect-square object-cover rounded-sm border border-border"
          />
        ) : (
          <div className="w-full max-w-[200px] aspect-square border border-border rounded-sm flex items-center justify-center">
            <Disc className="h-16 w-16 text-muted-foreground" />
          </div>
        )}
        <div>
          <Badge variant="rust" className="mb-2">
            {release.type.replace("_", " ").toLowerCase()}
          </Badge>
          <h1 className="font-display text-4xl md:text-5xl tracking-tight">
            {release.title}
          </h1>
          <p className="text-lg text-muted-foreground mt-1">
            <Link
              href={`/bands/${release.band.slug}`}
              className="hover:text-primary"
            >
              {release.band.name}
            </Link>
          </p>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {release.year ?? "?"}
              {release.releaseDate && (
                <> ({new Date(release.releaseDate).toLocaleDateString()})</>
              )}
            </span>
            {release.trackCount && (
              <span>{release.trackCount} tracks</span>
            )}
            {release.durationSec && (
              <span>
                {Math.floor(release.durationSec / 60)}m
              </span>
            )}
          </div>
          <div className="mt-4">
            <ReleaseRating
              releaseId={release.id}
              avg={avgRating}
              count={ratingCount}
              myValue={myRating?.value ?? null}
              signedIn={!!userId}
            />
          </div>
        </div>
      </header>

      {release.description && (
        <p className="text-sm text-muted-foreground leading-relaxed mb-8 whitespace-pre-line">
          {release.description}
        </p>
      )}

      <div className="space-y-4 mb-10">
        {bandcampAlbumId && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Bandcamp</CardTitle>
            </CardHeader>
            <CardContent>
              <BandcampEmbed albumId={bandcampAlbumId} size="large" />
            </CardContent>
          </Card>
        )}
        {release.spotifyId && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Spotify</CardTitle>
            </CardHeader>
            <CardContent>
              <SpotifyEmbed type="album" id={release.spotifyId} height={352} />
            </CardContent>
          </Card>
        )}
        {!bandcampAlbumId && !release.spotifyId && (
          <p className="text-sm text-muted-foreground italic">
            No embedded player linked yet.
            {release.bandcampUrl && (
              <>
                {" "}
                <a
                  href={release.bandcampUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Open on Bandcamp →
                </a>
              </>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
