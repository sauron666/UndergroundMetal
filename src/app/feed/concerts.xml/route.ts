import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { buildRss } from "@/lib/rss";

export const runtime = "nodejs";
export const revalidate = 600;

export async function GET() {
  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const shows = await db.show
    .findMany({
      where: { date: { gte: new Date() }, status: { not: "PAST" } },
      include: {
        venue: true,
        bands: { include: { band: true }, orderBy: { position: "asc" }, take: 5 },
      },
      orderBy: { date: "asc" },
      take: 80,
    })
    .catch(() => []);

  const xml = buildRss(
    {
      title: "Underground Metal — Concerts",
      description: "Upcoming rock and metal concerts.",
      link: `${base}/concerts`,
      selfLink: `${base}/feed/concerts.xml`,
    },
    shows.map((s) => ({
      title: s.title,
      link: `${base}/concerts/${s.slug}`,
      description:
        `${new Date(s.date).toDateString()} · ${s.venue.name}, ${s.venue.city} [${s.venue.countryCode}] — ${s.bands
          .map((b) => b.band.name)
          .join(", ")}`,
      pubDate: s.createdAt,
      guid: `urn:um:show:${s.id}`,
      categories: [s.venue.countryCode, s.venue.city],
    }))
  );

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=600",
    },
  });
}
