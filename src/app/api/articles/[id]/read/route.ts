import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { trackRead } from "@/server/articles/track-read";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const session = await auth();

  // Confirm article is published before tracking
  const article = await db.article.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!article || article.status !== "PUBLISHED") {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  await trackRead({
    articleId: id,
    userId: session?.user?.id ?? null,
    ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    premium: session?.user?.tier === "PREMIUM",
  });
  return NextResponse.json({ ok: true });
}
