import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { buildUrlset } from "@/lib/sitemap-xml";

export const runtime = "nodejs";
export const revalidate = 3600;

const STATIC_PATHS = [
  "",
  "/discover",
  "/bands",
  "/concerts",
  "/festivals",
  "/articles",
  "/calendar",
  "/lists",
  "/people",
  "/forum",
  "/zine",
  "/trending",
  "/bg-archive",
  "/premium",
  "/about",
  "/contribute",
  "/legal/terms",
  "/legal/privacy",
  "/legal/dmca",
  "/legal/cookies",
];

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ page: string }> }
) {
  const { page } = await ctx.params;
  if (page !== "1") {
    return new NextResponse("Not found", { status: 404 });
  }
  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const xml = buildUrlset(
    STATIC_PATHS.map((p) => ({
      loc: `${base}${p}`,
      changefreq: "weekly",
      priority: p === "" ? 1.0 : 0.7,
    }))
  );
  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
