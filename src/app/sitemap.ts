import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");

  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/discover",
    "/bands",
    "/concerts",
    "/articles",
    "/bg-archive",
    "/premium",
    "/about",
  ].map((p) => ({
    url: `${base}${p}`,
    changeFrequency: "weekly",
    priority: p === "" ? 1 : 0.7,
  }));

  const [bands, articles, shows] = await Promise.all([
    db.band.findMany({ select: { slug: true, updatedAt: true } }).catch(() => []),
    db.article
      .findMany({
        where: { status: "PUBLISHED" },
        select: { slug: true, publishedAt: true, updatedAt: true },
      })
      .catch(() => []),
    db.show
      .findMany({
        where: { date: { gte: new Date() } },
        select: { slug: true, updatedAt: true },
      })
      .catch(() => []),
  ]);

  return [
    ...staticRoutes,
    ...bands.map((b) => ({
      url: `${base}/bands/${b.slug}`,
      lastModified: b.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...articles.map((a) => ({
      url: `${base}/articles/${a.slug}`,
      lastModified: a.publishedAt ?? a.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...shows.map((s) => ({
      url: `${base}/concerts/${s.slug}`,
      lastModified: s.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
  ];
}
