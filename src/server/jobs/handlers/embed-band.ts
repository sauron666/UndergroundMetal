/**
 * Compute a band embedding from its textual signature (name + genres + themes
 * + bio) and persist it.
 *
 * Routing:
 *   - If VOYAGE_API_KEY is set we call Voyage AI directly (1024-dim).
 *   - Otherwise we fall back to a Claude-Haiku pseudo-embedding (32-dim).
 *
 * Both paths produce L2-normalised vectors so cosine similarity reduces to
 * a dot product.
 *
 * Payload: { bandId: string }
 */

import crypto from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { embed } from "@/server/ai/embeddings";

const Payload = z.object({ bandId: z.string() });

function buildSignature(band: {
  name: string;
  countryCode: string | null;
  formedYear: number | null;
  bio: string | null;
  themes: string[];
  tags: string[];
  heaviness: number;
  undergroundScore: number;
  genres: { genre: { name: string } }[];
}) {
  return [
    `Band: ${band.name}`,
    band.countryCode ? `Country: ${band.countryCode}` : null,
    band.formedYear ? `Formed: ${band.formedYear}` : null,
    `Heaviness: ${band.heaviness}/10`,
    `Underground: ${band.undergroundScore}/10`,
    band.genres.length
      ? `Genres: ${band.genres.map((g) => g.genre.name).join(", ")}`
      : null,
    band.themes.length ? `Themes: ${band.themes.join(", ")}` : null,
    band.tags.length ? `Tags: ${band.tags.slice(0, 8).join(", ")}` : null,
    band.bio ? `Bio: ${band.bio.slice(0, 600)}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function embedBand(payload: unknown) {
  const { bandId } = Payload.parse(payload);
  const band = await db.band.findUnique({
    where: { id: bandId },
    include: { genres: { include: { genre: true } } },
  });
  if (!band) throw new Error(`band not found: ${bandId}`);

  const signature = buildSignature(band);
  const digest = crypto.createHash("sha256").update(signature).digest("hex");

  // Re-embedding only when the signature changed AND the model is the same;
  // a model change forces a refresh so we don't mix dimensions.
  const result = await embed(signature);

  const existing = await db.bandEmbedding.findUnique({ where: { bandId } });
  if (
    existing &&
    existing.digest === digest &&
    existing.model === result.model &&
    existing.dimension === result.dimension
  ) {
    return { skipped: true };
  }

  await db.bandEmbedding.upsert({
    where: { bandId },
    create: {
      bandId,
      model: result.model,
      vector: result.vector,
      dimension: result.dimension,
      digest,
    },
    update: {
      model: result.model,
      vector: result.vector,
      dimension: result.dimension,
      digest,
    },
  });

  return { dimension: result.dimension, model: result.model };
}
