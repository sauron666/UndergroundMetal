import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Underground Metal",
    short_name: "U.M.",
    description:
      "AI-curated discovery of mainstream and underground rock & metal — bands, concerts, sourced editorial.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    lang: "en",
    categories: ["music", "entertainment", "news"],
    icons: [
      {
        src: "/favicon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
    shortcuts: [
      {
        name: "AI Discovery",
        short_name: "Discover",
        url: "/discover",
        description: "Find new bands by style, mood or region",
      },
      {
        name: "Concerts",
        short_name: "Live",
        url: "/concerts",
        description: "Upcoming shows",
      },
      {
        name: "Trending",
        short_name: "Trending",
        url: "/trending",
        description: "What's rising right now",
      },
    ],
    // Set the OG site URL so PWA install respects deployed origin
    ...(env.NEXT_PUBLIC_APP_URL ? { id: "/" } : {}),
  };
}
