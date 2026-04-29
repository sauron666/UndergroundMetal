/**
 * AI Band Discovery Orchestrator
 *
 * Pipeline:
 *   1. User sends free-form query + optional filters (country, era, heaviness).
 *   2. Claude generates a structured list of band recommendations split into
 *      `mainstream` and `underground` tiers, each with rationale and 1+ verifiable
 *      external references (MusicBrainz / Bandcamp / Metal Archives URL).
 *   3. We hash the normalized query and cache the result in DiscoveryQuery so
 *      repeat queries are free.
 *   4. We try to enrich each suggestion with our local Band records by name
 *      lookup, so the UI can link straight to /bands/<slug> when we know them.
 *
 * The model is instructed to refuse hallucinated bands. Prompt caching is used
 * on the system prompt so repeat calls are cheap.
 */

import crypto from "node:crypto";
import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAnthropic, MODELS } from "./anthropic";

export const DiscoveryFiltersSchema = z.object({
  countryCodes: z.array(z.string().length(2)).optional(),
  // Lower bound underground score (1-10, 10 = obscure-only)
  minUnderground: z.number().int().min(1).max(10).optional(),
  // Heaviness range
  heaviness: z
    .object({
      min: z.number().int().min(1).max(10),
      max: z.number().int().min(1).max(10),
    })
    .optional(),
  // Era: decade or year range
  yearRange: z
    .object({ from: z.number().int(), to: z.number().int() })
    .optional(),
  // Limit per tier
  limit: z.number().int().min(1).max(20).default(8),
});

export type DiscoveryFilters = z.infer<typeof DiscoveryFiltersSchema>;

export const BandSuggestionSchema = z.object({
  name: z.string(),
  countryCode: z.string().length(2).nullable(),
  formedYear: z.number().int().nullable(),
  primaryGenre: z.string(),
  subgenres: z.array(z.string()).default([]),
  themes: z.array(z.string()).default([]),
  heaviness: z.number().int().min(1).max(10),
  undergroundScore: z.number().int().min(1).max(10),
  rationale: z.string(),
  references: z
    .array(
      z.object({
        kind: z.enum([
          "metal-archives",
          "musicbrainz",
          "bandcamp",
          "wikipedia",
          "official",
          "other",
        ]),
        url: z.string().url().or(z.string()),
        note: z.string().optional(),
      })
    )
    .default([]),
  // Optional flagship release to seed for the user
  signatureRelease: z
    .object({ title: z.string(), year: z.number().int().nullable() })
    .nullable()
    .optional(),
});

export type BandSuggestion = z.infer<typeof BandSuggestionSchema>;

export const DiscoveryResultSchema = z.object({
  query: z.string(),
  interpretation: z.string(),
  mainstream: z.array(BandSuggestionSchema),
  underground: z.array(BandSuggestionSchema),
  // Bands the model thinks the user definitely already knows; we can dedupe
  skip: z.array(z.string()).default([]),
  // Genre / mood tags inferred from the query
  inferredTags: z.array(z.string()).default([]),
});

export type DiscoveryResult = z.infer<typeof DiscoveryResultSchema>;

const SYSTEM_PROMPT = `You are the curator of an underground rock and metal encyclopedia.
Your job is to take a fan's free-form query (style, mood, theme, region, era)
and return TWO tiers of band recommendations:

  - mainstream: bands the average metal fan likely already knows.
  - underground: deeply obscure bands. Demos, defunct projects, regional
    scene staples, single-album wonders, raw black metal one-man-bands,
    niche DIY acts. The more obscure the better, as long as they exist.

CRITICAL RULES:
  1. Never invent bands. If you are not sure a band exists with that exact
     name, omit it.
  2. Every suggestion MUST include at least one external reference URL pointing
     to a primary source: Metal Archives (metal-archives.com), MusicBrainz
     (musicbrainz.org), Bandcamp, or Wikipedia. If you cannot supply one, omit.
  3. For Bulgarian, Romanian, ex-Yugoslav, Greek and other Balkan / Eastern
     European underground requests, lean heavily into local scenes.
  4. Heaviness is a 1-10 scale: 1 = soft rock, 5 = thrash, 8 = death/black,
     10 = noisecore / war metal / grindcore extremes.
  5. UndergroundScore is a 1-10 scale: 1 = stadium act, 5 = niche but known,
     8 = scene-only, 10 = nearly impossible to find.
  6. If the user asks for Bulgarian metal, surface acts like Epizod, Era,
     Konkvest, Mass Psychosys, Bedevil, Mortal Decay (BG), Skygge, Demonic
     Christ, Infest, Chaossfear, Svarrogh — but only those you can verify.
  7. Provide a short rationale per band tying it to the query.
  8. Output strict JSON matching the requested schema. No prose outside.`;

function buildUserPrompt(query: string, filters: DiscoveryFilters): string {
  return [
    `Query: ${query}`,
    filters.countryCodes?.length
      ? `Restrict country to: ${filters.countryCodes.join(", ")}`
      : null,
    filters.minUnderground
      ? `Minimum underground score: ${filters.minUnderground}/10`
      : null,
    filters.heaviness
      ? `Heaviness band: ${filters.heaviness.min}-${filters.heaviness.max}/10`
      : null,
    filters.yearRange
      ? `Era: ${filters.yearRange.from}-${filters.yearRange.to}`
      : null,
    `Return up to ${filters.limit} bands per tier.`,
    "",
    "Respond with JSON only, in this shape:",
    JSON.stringify(
      {
        query: "...",
        interpretation: "1-2 sentences on how you read the query",
        inferredTags: ["..."],
        mainstream: [
          {
            name: "...",
            countryCode: "XX",
            formedYear: 1990,
            primaryGenre: "...",
            subgenres: ["..."],
            themes: ["..."],
            heaviness: 7,
            undergroundScore: 3,
            rationale: "...",
            references: [{ kind: "metal-archives", url: "https://...", note: "" }],
            signatureRelease: { title: "...", year: 1991 },
          },
        ],
        underground: [],
        skip: [],
      },
      null,
      2
    ),
  ]
    .filter(Boolean)
    .join("\n");
}

function hashQuery(query: string, filters: DiscoveryFilters): string {
  const h = crypto.createHash("sha256");
  h.update(query.trim().toLowerCase());
  h.update(JSON.stringify(filters));
  return h.digest("hex").slice(0, 32);
}

function extractJson(raw: string): unknown {
  // Models occasionally wrap JSON in fences. Be defensive.
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : raw;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("Discovery: model did not return JSON");
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

export async function discover(
  query: string,
  rawFilters: Partial<DiscoveryFilters> = {}
): Promise<DiscoveryResult & { cached: boolean }> {
  const filters = DiscoveryFiltersSchema.parse({ limit: 8, ...rawFilters });
  const hash = hashQuery(query, filters);

  const cached = await db.discoveryQuery
    .findUnique({ where: { hash } })
    .catch(() => null);

  if (cached) {
    await db.discoveryQuery
      .update({ where: { hash }, data: { hitCount: { increment: 1 } } })
      .catch(() => null);
    return { ...(cached.result as DiscoveryResult), cached: true };
  }

  const client = getAnthropic();
  const message = await client.messages.create({
    model: MODELS.discovery,
    max_tokens: 4096,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: buildUserPrompt(query, filters) }],
  });

  const text = message.content
    .filter((c): c is Anthropic.TextBlock => c.type === "text")
    .map((c) => c.text)
    .join("\n");

  const parsed = DiscoveryResultSchema.parse(extractJson(text));

  await db.discoveryQuery
    .create({
      data: {
        hash,
        prompt: query,
        filters: filters as object,
        result: parsed as object,
      },
    })
    .catch(() => null);

  return { ...parsed, cached: false };
}

// Augment suggestions with local DB matches so the UI can hyperlink
export async function attachLocalBands(result: DiscoveryResult) {
  const allNames = [
    ...result.mainstream.map((b) => b.name),
    ...result.underground.map((b) => b.name),
  ];
  if (allNames.length === 0) return result;

  const local = await db.band
    .findMany({
      where: { name: { in: allNames, mode: "insensitive" } },
      select: { id: true, slug: true, name: true, imageUrl: true },
    })
    .catch(() => []);

  const map = new Map(local.map((b) => [b.name.toLowerCase(), b]));
  const decorate = (b: BandSuggestion) => {
    const hit = map.get(b.name.toLowerCase());
    return hit ? { ...b, local: hit } : b;
  };

  return {
    ...result,
    mainstream: result.mainstream.map(decorate),
    underground: result.underground.map(decorate),
  };
}
