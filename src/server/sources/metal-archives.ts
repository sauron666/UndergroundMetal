/**
 * Metal Archives (Encyclopaedia Metallum) bridge.
 *
 * Important: Metal Archives' Terms of Service prohibit aggressive scraping and
 * republishing their database wholesale. We therefore do NOT scrape full pages.
 * Instead we:
 *   - Use the official AJAX search endpoint to *resolve* a band name to an ID,
 *     so we can store a stable reference and let users click through.
 *   - Keep all rate limits well below their site's threshold (1 req / 2 sec).
 *   - Never store copyrighted content (album art, full bios) — only IDs + URLs.
 *
 * Endpoint reference (publicly documented in their forum):
 *   https://www.metal-archives.com/search/ajax-band-search/?field=name&query=...
 */

const BASE = "https://www.metal-archives.com";
const headers: HeadersInit = {
  "User-Agent":
    "UndergroundMetal/0.1 (+https://undergroundmetal.app, contact@undergroundmetal.app)",
  Accept: "application/json, text/html",
};

let lastCallAt = 0;
async function throttle(minGapMs = 2100) {
  const now = Date.now();
  const wait = Math.max(0, minGapMs - (now - lastCallAt));
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCallAt = Date.now();
}

interface MABandSearchRow {
  /** Original payload is an array. The first cell is an HTML anchor. */
  raw: string[];
}

interface MABandSearchResponse {
  iTotalRecords: number;
  iTotalDisplayRecords: number;
  aaData: string[][];
}

export interface MABandRef {
  id: number;
  name: string;
  url: string;
  genre?: string;
  country?: string;
}

const ANCHOR_RE = /<a href="([^"]+)"[^>]*>([^<]+)<\/a>/i;

export async function resolveBand(name: string): Promise<MABandRef | null> {
  await throttle();
  const url = `${BASE}/search/ajax-band-search/?field=name&query=${encodeURIComponent(
    name
  )}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    if (res.status === 429) throw new Error("metal-archives: rate limited");
    return null;
  }
  const json = (await res.json()) as MABandSearchResponse;
  const row = json.aaData?.[0];
  if (!row) return null;
  const m = row[0]?.match(ANCHOR_RE);
  if (!m) return null;
  const href = m[1];
  const idMatch = href.match(/\/bands\/[^/]+\/(\d+)/);
  if (!idMatch) return null;
  return {
    id: Number(idMatch[1]),
    name: m[2],
    url: href.startsWith("http") ? href : `${BASE}${href}`,
    genre: row[1] || undefined,
    country: row[2] || undefined,
  };
}

export function bandUrl(id: number, slug = "band") {
  return `${BASE}/bands/${encodeURIComponent(slug)}/${id}`;
}
