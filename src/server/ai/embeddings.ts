/**
 * Embedding provider abstraction.
 *
 * - When VOYAGE_API_KEY is set, calls the Voyage AI REST API directly (no SDK
 *   dependency). Voyage 3 produces 1024-dim vectors with strong music/text
 *   semantic separation, far better than the prior pseudo-embedding.
 * - Otherwise, falls back to the existing Claude Haiku pseudo-embedding so
 *   the similar-bands feature keeps working in dev.
 *
 * Vectors are L2-normalised on the server side so cosine similarity reduces
 * to a dot product.
 */

import { env } from "@/lib/env";
import { normalise } from "@/lib/vector";
import { getAnthropic, MODELS } from "./anthropic";

export interface EmbeddingResult {
  vector: number[];
  dimension: number;
  model: string;
}

async function embedViaVoyage(text: string): Promise<EmbeddingResult> {
  if (!env.VOYAGE_API_KEY) throw new Error("VOYAGE_API_KEY not set");
  const res = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${env.VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({
      model: env.VOYAGE_MODEL,
      input: [text],
      input_type: "document",
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`voyage ${res.status}: ${body.slice(0, 200)}`);
  }
  const j = (await res.json()) as {
    data: { embedding: number[] }[];
    model: string;
  };
  const raw = j.data[0]?.embedding;
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error("voyage: empty embedding");
  }
  return {
    vector: normalise(raw),
    dimension: raw.length,
    model: `voyage:${j.model ?? env.VOYAGE_MODEL}`,
  };
}

const PSEUDO_DIM = 32;

const PSEUDO_SYSTEM = `You are a metal-genre semantic embedding model.
Given a band's textual signature, output a JSON array of exactly ${PSEUDO_DIM}
floating-point numbers in the range [-1, 1] capturing its position in the
metal-style space. Identical signatures must produce identical vectors.
Respond with JSON only — a flat array.`;

async function embedViaClaude(text: string): Promise<EmbeddingResult> {
  const client = getAnthropic();
  const res = await client.messages.create({
    model: MODELS.moderation,
    max_tokens: 512,
    system: [{ type: "text", text: PSEUDO_SYSTEM }],
    messages: [{ role: "user", content: text }],
  });
  const out = res.content
    .map((c) => (c.type === "text" ? c.text : ""))
    .join("\n");
  const start = out.indexOf("[");
  const end = out.lastIndexOf("]");
  const raw = JSON.parse(out.slice(start, end + 1));
  if (!Array.isArray(raw) || raw.length !== PSEUDO_DIM) {
    throw new Error(`pseudo: invalid shape len=${raw.length ?? "n/a"}`);
  }
  return {
    vector: normalise(raw.map((x: unknown) => Number(x))),
    dimension: PSEUDO_DIM,
    model: `claude-haiku-pseudo-${PSEUDO_DIM}`,
  };
}

export async function embed(text: string): Promise<EmbeddingResult> {
  if (env.VOYAGE_API_KEY) {
    return embedViaVoyage(text);
  }
  return embedViaClaude(text);
}
