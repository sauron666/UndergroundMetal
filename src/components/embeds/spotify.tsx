/**
 * Spotify embed. Accepts album / track / artist Spotify IDs.
 *
 * Spotify's embed endpoint is publicly accessible — no API key needed for
 * playback in an iframe. Theming is limited (dark only) but matches our brand.
 */

interface Props {
  type?: "album" | "track" | "artist" | "playlist";
  id: string;
  height?: number;
}

export function SpotifyEmbed({ type = "album", id, height = 152 }: Props) {
  if (!id) return null;
  const src = `https://open.spotify.com/embed/${type}/${id}?utm_source=undergroundmetal`;
  return (
    <iframe
      title="Spotify player"
      src={src}
      width="100%"
      height={height}
      style={{ border: 0, borderRadius: 2 }}
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      loading="lazy"
    />
  );
}
