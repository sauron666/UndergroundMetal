/**
 * Unified band ingestion. Given a name, fetch from multiple sources, merge, and
 * upsert into our DB. Used by:
 *   - admin "Add band" form
 *   - the discovery flow (when a user clicks "import to library")
 *   - the seed script
 *
 * Source precedence for conflicting fields: MusicBrainz > Metal-Archives ref >
 * manual. We never overwrite manually-edited verified bands.
 */

import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";
import * as MB from "./musicbrainz";
import * as MA from "./metal-archives";

export interface IngestInput {
  name: string;
  countryCode?: string;
  primaryGenre?: string;
  themes?: string[];
  // Hints from AI discovery
  formedYear?: number;
  metalArchivesId?: number;
  musicbrainzId?: string;
  undergroundScore?: number;
  heaviness?: number;
}

export async function ingestBand(input: IngestInput) {
  const existing = await db.band.findFirst({
    where: {
      OR: [
        { slug: slugify(input.name) },
        input.musicbrainzId ? { musicbrainzId: input.musicbrainzId } : { id: "_" },
        input.metalArchivesId ? { metalArchivesId: input.metalArchivesId } : { id: "_" },
      ],
    },
  });

  // Try to enrich from MB if no MB id yet
  let mbId = input.musicbrainzId ?? existing?.musicbrainzId ?? null;
  let mbCountry = existing?.countryCode ?? input.countryCode ?? null;
  let mbFormed = existing?.formedYear ?? input.formedYear ?? null;
  let mbTags: string[] = existing?.tags ?? [];

  if (!mbId) {
    const search = await MB.searchArtist(input.name, 5).catch(() => null);
    const top = search?.artists?.[0];
    if (top && top.name.toLowerCase() === input.name.toLowerCase()) {
      mbId = top.id;
      mbCountry = top.country ?? mbCountry;
      const begin = top["life-span"]?.begin;
      if (begin) {
        const y = parseInt(begin.slice(0, 4), 10);
        if (!Number.isNaN(y)) mbFormed = y;
      }
      mbTags = (top.tags ?? []).map((t) => t.name).slice(0, 12);
    }
  }

  // Resolve Metal Archives reference (id only, never scrape page content)
  let maId = input.metalArchivesId ?? existing?.metalArchivesId ?? null;
  let maUrl: string | null = null;
  if (!maId) {
    const ref = await MA.resolveBand(input.name).catch(() => null);
    if (ref) {
      maId = ref.id;
      maUrl = ref.url;
    }
  }

  const slug = existing?.slug ?? slugify(input.name);

  const band = await db.band.upsert({
    where: { id: existing?.id ?? "_new_" },
    create: {
      slug,
      name: input.name,
      countryCode: mbCountry ?? null,
      formedYear: mbFormed,
      tags: mbTags,
      themes: input.themes ?? [],
      musicbrainzId: mbId,
      metalArchivesId: maId,
      undergroundScore: input.undergroundScore ?? 6,
      heaviness: input.heaviness ?? 6,
    },
    update: {
      countryCode: existing?.verified ? existing.countryCode : mbCountry,
      formedYear: existing?.verified ? existing.formedYear : mbFormed,
      tags: existing?.verified ? existing.tags : mbTags,
      musicbrainzId: mbId ?? existing?.musicbrainzId,
      metalArchivesId: maId ?? existing?.metalArchivesId,
    },
  });

  if (maId && maUrl) {
    await db.externalSource
      .upsert({
        where: { id: `ma-${band.id}` },
        create: {
          id: `ma-${band.id}`,
          type: "METAL_ARCHIVES",
          externalId: String(maId),
          url: maUrl,
          bandId: band.id,
        },
        update: { url: maUrl, externalId: String(maId) },
      })
      .catch(() => null);
  }

  return band;
}
