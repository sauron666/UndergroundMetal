/**
 * Compute a band embedding from its textual signature (name + genres + themes
 * + bio) and persist it.
 *
 * Strategy: ask Claude Haiku to produce a fixed-dimension semantic vector via
 * a structured prompt — this is a lightweight, dependency-free path that
 * doesn't require an embedding-specific provider. For production scale,
 * swap to Voyage AI / OpenAI embeddings inside this single function.
 *
 * The vector is L2-normalised to unit length so cosine similarity reduces to
 * a dot product.
 *
 * Payload: { bandId: string }
 */

import crypto from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAnthropic, MODELS } from "@/server/ai/anthropic";

const Payload = z.object({ bandId: z.string() });

const DIMENSION = 32;
const MODEL_TAG = `claude-haiku-pseudo-${DIMENSION}`;

const SYSTEM = `You are a metal-genre semantic embedding model.
Given a band's textual signature, output a JSON array of exactly ${DIMENSION}
floating-point numbers in the range [-1, 1] that capture its position in the
metal-style space. Axes you should *implicitly* encode (without naming them):
heaviness, atmosphere, technicality, raw vs. polished production, regional
scene flavour, lyrical themes, era. Identical signatures must produce identical
vectors. Respond with JSON only — a flat array.`;

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

function normalise(vec: number[]): number[] {
  const mag = Math.sqrt(vec.reduce((s, x) => s + x * x, 0));
  if (mag === 0) return vec;
  return vec.map((x) => x / mag);
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

  const existing = await db.bandEmbedding.findUnique({ where: { bandId } });
  if (existing && existing.digest === digest && existing.model === MODEL_TAG) {
    return { skipped: true };
  }

  const client = getAnthropic();
  const res = await client.messages.create({
    model: MODELS.moderation,
    max_tokens: 512,
    system: [{ type: "text", text: SYSTEM }],
    messages: [{ role: "user", content: signature }],
  });

  const text = res.content
    .map((c) => (c.type === "text" ? c.text : ""))
    .join("\n");
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  const raw = JSON.parse(text.slice(start, end + 1));
  if (!Array.isArray(raw) || raw.length !== DIMENSION) {
    throw new Error(`invalid embedding shape: len=${raw.length ?? "n/a"}`);
  }
  const vector = normalise(raw.map((x) => Number(x)));

  await db.bandEmbedding.upsert({
    where: { bandId },
    create: {
      bandId,
      model: MODEL_TAG,
      vector,
      dimension: DIMENSION,
      digest,
    },
    update: {
      model: MODEL_TAG,
      vector,
      dimension: DIMENSION,
      digest,
    },
  });

  return { dimension: DIMENSION };
}
