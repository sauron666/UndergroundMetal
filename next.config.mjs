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
    ],
  },
  experimental: {
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default nextConfig;
