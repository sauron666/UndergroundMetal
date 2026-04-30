import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Admin-only article autocomplete used by the series-articles panel.
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || !["EDITOR", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ articles: [] });
  }
  const articles = await db.article.findMany({
    where: { title: { contains: q, mode: "insensitive" } },
    select: { id: true, slug: true, title: true },
    orderBy: { updatedAt: "desc" },
    take: 12,
  });
  return NextResponse.json({ articles });
}
