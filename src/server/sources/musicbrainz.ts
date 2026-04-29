/**
 * MusicBrainz client.
 *
 * MusicBrainz is open data (CC0), no API key required, but a custom User-Agent
 * is mandatory and the public service is rate-limited to ~1 req/sec. We respect
 * that with an internal queue.
 *
 * Docs: https://musicbrainz.org/doc/MusicBrainz_API
 */

import { env } from "@/lib/env";

const BASE = "https://musicbrainz.org/ws/2";
const headers: HeadersInit = {
  "User-Agent": env.MUSICBRAINZ_USER_AGENT,
  Accept: "application/json",
};

let lastCallAt = 0;
async function throttle() {
  const now = Date.now();
  const wait = Math.max(0, 1100 - (now - lastCallAt));
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCallAt = Date.now();
}

async function mbFetch<T>(path: string): Promise<T> {
  await throttle();
  const url = `${BASE}${path}${path.includes("?") ? "&" : "?"}fmt=json`;
  const res = await fetch(url, { headers, cache: "no-store" });
  if (!res.ok) {
    throw new Error(`MusicBrainz ${res.status} on ${path}`);
  }
  return (await res.json()) as T;
}

export interface MBArtist {
  id: string;
  name: string;
  country?: string;
  area?: { name: string };
  "begin-area"?: { name: string };
  "life-span"?: { begin?: string; end?: string; ended?: boolean };
  tags?: { name: string; count: number }[];
  type?: string;
  disambiguation?: string;
}

export interface MBSearchResponse<T> {
  count: number;
  offset: number;
  artists?: T[];
  recordings?: T[];
  releases?: T[];
}

export async function searchArtist(query: string, limit = 10) {
  const q = encodeURIComponent(query);
  return mbFetch<MBSearchResponse<MBArtist>>(
    `/artist?query=${q}&limit=${limit}`
  );
}

export async function getArtist(id: string) {
  return mbFetch<MBArtist & { "release-groups"?: unknown[] }>(
    `/artist/${id}?inc=tags+release-groups+url-rels`
  );
}

export async function getArtistReleases(id: string) {
  return mbFetch<{ "release-groups": Array<{ id: string; title: string; "first-release-date": string; "primary-type": string }> }>(
    `/release-group?artist=${id}&type=album|ep|single&limit=100`
  );
}
