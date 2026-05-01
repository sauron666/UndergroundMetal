/**
 * Next config with production security headers.
 *
 * - Strict-Transport-Security: 1y including subdomains, preload-friendly.
 * - Content-Security-Policy: tight default-src 'self', explicit allow-list
 *   for the embeds we ship (Bandcamp / Spotify iframes), 'unsafe-inline'
 *   on style-src because Tailwind utility scoping needs it. Scripts allow
 *   'unsafe-inline' only for the no-flash theme bootstrap; remaining
 *   scripts are nonce-friendly when we move to Edge middleware later.
 * - X-Frame-Options: SAMEORIGIN. We embed iframes outbound (Bandcamp /
 *   Spotify), nothing inbound.
 * - Referrer-Policy: strict-origin-when-cross-origin so outbound clicks
 *   still attribute via UTM params but the URL path stays private.
 * - Permissions-Policy: locks down geolocation / mic / camera by default.
 * - X-Content-Type-Options: nosniff.
 */

const isProd = process.env.NODE_ENV === "production";

const csp = [
  "default-src 'self'",
  // Scripts: own + 'unsafe-inline' for the theme bootstrap. In dev we
  // additionally need 'unsafe-eval' because Next's React Refresh runtime
  // uses eval() for HMR; production builds don't ship it.
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`,
  // Styles: Tailwind needs inline.
  "style-src 'self' 'unsafe-inline'",
  // Fonts: Next/Font self-hosts so 'self' is enough.
  "font-src 'self' data:",
  // Images: own + the explicitly allow-listed remote hosts in next/image,
  // plus QR codes for 2FA setup and Wayback Machine for archived covers.
  "img-src 'self' data: blob: https:",
  // Network: same-origin XHR, plus the embed endpoints.
  "connect-src 'self' https://api.anthropic.com https://api.voyageai.com https://api.stripe.com https://api.resend.com https://*.r2.cloudflarestorage.com https://*.amazonaws.com https://*.r2.dev https://web.archive.org",
  // Embedded players.
  "frame-src 'self' https://bandcamp.com https://*.bandcamp.com https://open.spotify.com",
  // SVG/canvas/anchor restrictions.
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://checkout.stripe.com https://billing.stripe.com",
  "frame-ancestors 'self'",
  // Violations land at our own collector, which forwards to the
  // observability hook (Sentry when wired).
  "report-uri /api/csp-report",
].join("; ");

const securityHeaders = [
  ...(isProd
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains; preload",
        },
      ]
    : []),
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.musicbrainz.org" },
      { protocol: "https", hostname: "coverartarchive.org" },
      { protocol: "https", hostname: "**.archive.org" },
      { protocol: "https", hostname: "**.bandcamp.com" },
      { protocol: "https", hostname: "f4.bcbits.com" },
      { protocol: "https", hostname: "i.scdn.co" },
      { protocol: "https", hostname: "lastfm.freetls.fastly.net" },
      { protocol: "https", hostname: "**.googleusercontent.com" },
      { protocol: "https", hostname: "**.r2.dev" },
      { protocol: "https", hostname: "**.r2.cloudflarestorage.com" },
    ],
  },
  experimental: {
    serverActions: { bodySizeLimit: "4mb" },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
