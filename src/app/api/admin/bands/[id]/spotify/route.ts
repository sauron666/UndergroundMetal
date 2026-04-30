import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { enrichByBandName } from "@/server/sources/spotify";
import { enqueue } from "@/server/jobs/queue";

export const runtime = "nodejs";

/**
 * Pull artist + album metadata from Spotify and merge into our records.
 *
 * Conservative: never overwrites manually-edited verified bands. Stores the
 * spotifyId on Band; for each album returned by Spotify, creates a Release
 * row if no release with the same title-and-year already exists.
 */
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !["EDITOR", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const band = await db.band.findUnique({
    where: { id },
    include: { releases: true, sources: true },
  });
  if (!band) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let result;
  try {
    result = await enrichByBandName(band.name);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Spotify error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
  if (!result.artist) {
    return NextResponse.json({ error: "Not found on Spotify" }, { status: 404 });
  }

  // Update spotifyId + tag overlay
  await db.band.update({
    where: { id: band.id },
    data: {
      spotifyId: band.spotifyId ?? result.artist.id,
      tags: band.verified
        ? band.tags
        : Array.from(new Set([...(band.tags ?? []), ...result.artist.genres])),
    },
  });

  // Persist the Spotify reference so the public band page can link out.
  await db.externalSource
    .upsert({
      where: { id: `spotify-${band.id}` },
      create: {
        id: `spotify-${band.id}`,
        type: "SPOTIFY",
        externalId: result.artist.id,
        url: result.artist.external_urls.spotify,
        bandId: band.id,
        raw: result.artist as unknown as object,
      },
      update: {
        externalId: result.artist.id,
        url: result.artist.external_urls.spotify,
      },
    })
    .catch(() => null);

  // Create missing releases. Match by lowercased title + year to avoid
  // duplicating existing manually-curated entries.
  const have = new Set(
    band.releases.map(
      (r) => `${r.title.toLowerCase()}|${r.year ?? ""}`
    )
  );
  let createdReleases = 0;
  for (const album of result.albums) {
    const year = parseInt(album.release_date.slice(0, 4), 10);
    const key = `${album.name.toLowerCase()}|${year || ""}`;
    if (have.has(key)) continue;
    have.add(key);
    await db.release.create({
      data: {
        bandId: band.id,
        title: album.name,
        type:
          album.album_type === "single"
            ? "SINGLE"
            : album.album_type === "compilation"
            ? "COMPILATION"
            : "FULL_LENGTH",
        year: Number.isNaN(year) ? null : year,
        spotifyId: album.id,
        coverUrl: album.images[0]?.url ?? null,
        trackCount: album.total_tracks,
      },
    });
    createdReleases += 1;
  }

  // Embedding signature changed (tags + releases); refresh.
  await enqueue("EMBED_BAND", { bandId: band.id }).catch(() => null);

  return NextResponse.json({
    ok: true,
    spotifyId: result.artist.id,
    genres: result.artist.genres,
    createdReleases,
    totalAlbums: result.albums.length,
  });
}
