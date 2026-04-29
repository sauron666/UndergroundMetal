/**
 * Bandcamp embed.
 *
 * Bandcamp's standard embed iframes are publicly available for any track or
 * album page. The album/track ID is what matters; we accept either a numeric
 * id or the full embed URL.
 *
 * Usage:
 *   <BandcampEmbed albumId="123456789" />
 *   <BandcampEmbed url="https://bandcamp.com/EmbeddedPlayer/album=123456789/..." />
 */

interface Props {
  albumId?: string | number;
  trackId?: string | number;
  url?: string;
  size?: "small" | "medium" | "large";
}

const SIZES = {
  small: { w: "100%", h: 42 },
  medium: { w: "100%", h: 120 },
  large: { w: "100%", h: 350 },
} as const;

export function BandcampEmbed({ albumId, trackId, url, size = "large" }: Props) {
  let src = url;
  if (!src) {
    const id = albumId ?? trackId;
    const kind = albumId ? "album" : "track";
    if (!id) return null;
    src = `https://bandcamp.com/EmbeddedPlayer/${kind}=${id}/size=${
      size === "small" ? "small" : size === "medium" ? "medium" : "large"
    }/bgcol=0a0a0a/linkcol=8b0000/tracklist=false/transparent=true/`;
  }
  const dim = SIZES[size];
  return (
    <iframe
      title="Bandcamp player"
      src={src}
      width="100%"
      height={dim.h}
      style={{
        border: 0,
        background: "transparent",
        borderRadius: 2,
      }}
      seamless
      loading="lazy"
    />
  );
}
