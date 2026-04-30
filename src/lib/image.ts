/**
 * Image transform URL builder.
 *
 * The codebase serves uploaded images directly from S3-compatible storage
 * (R2 / S3 / Backblaze) — no on-the-fly resize. This helper wraps two paths
 * for adding optimization without coupling components to a vendor:
 *
 *   - Cloudflare Images (`/cdn-cgi/image/<options>/<source>`) when the public
 *     S3 URL is fronted by Cloudflare and Image Resizing is enabled on the
 *     account.
 *   - Otherwise: pass through unchanged. Components keep working without any
 *     code changes when transforms aren't available.
 *
 * Toggle via env var IMAGE_OPTIMIZE_PROVIDER:
 *   - "cloudflare"  → wrap with /cdn-cgi/image/...
 *   - unset / other → pass through
 *
 * Usage:
 *   const src = optimizedImage(rawUrl, { width: 600, quality: 80 });
 */

interface ImageOptions {
  width?: number;
  height?: number;
  quality?: number;
  fit?: "scale-down" | "contain" | "cover" | "crop" | "pad";
  format?: "auto" | "webp" | "avif";
}

const PROVIDER =
  (process.env.IMAGE_OPTIMIZE_PROVIDER as "cloudflare" | undefined) ?? null;

export function optimizedImage(
  src: string | null | undefined,
  opts: ImageOptions = {}
): string | null {
  if (!src) return null;
  if (!PROVIDER) return src;

  if (PROVIDER === "cloudflare") {
    return cloudflare(src, opts);
  }
  return src;
}

function cloudflare(src: string, opts: ImageOptions): string {
  const params: string[] = [];
  if (opts.width) params.push(`width=${opts.width}`);
  if (opts.height) params.push(`height=${opts.height}`);
  if (opts.quality) params.push(`quality=${opts.quality}`);
  if (opts.fit) params.push(`fit=${opts.fit}`);
  params.push(`format=${opts.format ?? "auto"}`);

  // Cloudflare Image Resizing expects:
  //   https://<your-domain>/cdn-cgi/image/<opts>/<absolute or relative source>
  // We build the URL relative to the source's origin so it works even when the
  // source domain is different from the site domain (it just won't be wrapped
  // unless that origin runs behind the same CF zone — caller's responsibility).
  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return src;
  }
  const transform = `/cdn-cgi/image/${params.join(",")}`;
  url.pathname = `${transform}${url.pathname}`;
  return url.toString();
}

/**
 * Convenience presets for common use cases.
 */
export const presets = {
  thumbnail: (src: string | null) =>
    optimizedImage(src, { width: 160, height: 160, fit: "cover", quality: 78 }),
  avatar: (src: string | null) =>
    optimizedImage(src, { width: 96, height: 96, fit: "cover", quality: 80 }),
  cardCover: (src: string | null) =>
    optimizedImage(src, { width: 480, height: 270, fit: "cover", quality: 78 }),
  bandPhoto: (src: string | null) =>
    optimizedImage(src, { width: 600, height: 600, fit: "cover", quality: 82 }),
  banner: (src: string | null) =>
    optimizedImage(src, { width: 1600, height: 600, fit: "cover", quality: 80 }),
} as const;
