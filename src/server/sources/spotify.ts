/**
 * Spotify Web API client (read-only, app-only auth).
 *
 * We use the Client Credentials grant — no user OAuth — and cache the access
 * token in module memory between calls. This is enough for metadata lookups
 * (artist + albums); user-scoped scopes aren't needed.
 *
 * Required env: SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET.
 */

import { env } from "@/lib/env";

interface TokenCache {
  token: string;
  expiresAt: number;
}

let cache: TokenCache | null = null;

async function getToken(): Promise<string> {
  if (!env.SPOTIFY_CLIENT_ID || !env.SPOTIFY_CLIENT_SECRET) {
    throw new Error("Spotify credentials not configured");
  }
  if (cache && cache.expiresAt > Date.now() + 5_000) return cache.token;

  const auth = Buffer.from(
    `${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`
  ).toString("base64");
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      authorization: `Basic ${auth}`,
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) {
    throw new Error(`spotify token: ${res.status}`);
  }
  const j = (await res.json()) as { access_token: string; expires_in: number };
  cache = {
    token: j.access_token,
    expiresAt: Date.now() + j.expires_in * 1000,
  };
  return j.access_token;
}

async function spFetch<T>(path: string): Promise<T> {
  const token = await getToken();
  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`spotify ${res.status} on ${path}`);
  }
  return (await res.json()) as T;
}

export interface SpotifyArtist {
  id: string;
  name: string;
  genres: string[];
  popularity: number;
  followers: { total: number };
  images: { url: string; width: number; height: number }[];
  external_urls: { spotify: string };
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  release_date: string;
  release_date_precision: "year" | "month" | "day";
  album_type: "album" | "single" | "compilation";
  total_tracks: number;
  images: { url: string; width: number; height: number }[];
  external_urls: { spotify: string };
}

export async function searchArtist(name: string): Promise<SpotifyArtist | null> {
  const j = await spFetch<{
    artists: { items: SpotifyArtist[] };
  }>(`/search?q=${encodeURIComponent(name)}&type=artist&limit=5`);
  // Pick the first result whose name matches case-insensitively.
  const exact = j.artists.items.find(
    (a) => a.name.toLowerCase() === name.toLowerCase()
  );
  return exact ?? j.artists.items[0] ?? null;
}

export async function getArtist(id: string): Promise<SpotifyArtist> {
  return spFetch<SpotifyArtist>(`/artists/${id}`);
}

export async function getArtistAlbums(
  id: string,
  limit = 30
): Promise<SpotifyAlbum[]> {
  const j = await spFetch<{ items: SpotifyAlbum[] }>(
    `/artists/${id}/albums?include_groups=album,single&limit=${limit}&market=US`
  );
  return j.items;
}

/**
 * Convenience: take a band name + (optional) existing spotifyId on a Band
 * and return enriched data ready to merge into Band/Release records. Used
 * by the admin "Enrich from Spotify" action.
 */
export async function enrichByBandName(name: string): Promise<{
  artist: SpotifyArtist | null;
  albums: SpotifyAlbum[];
}> {
  const artist = await searchArtist(name);
  if (!artist) return { artist: null, albums: [] };
  const albums = await getArtistAlbums(artist.id);
  return { artist, albums };
}
