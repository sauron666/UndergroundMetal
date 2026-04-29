import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const Body = z.object({
  bandId: z.string().optional(),
  articleId: z.string().optional(),
  bookmark: z.boolean(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success || (!parsed.data.bandId && !parsed.data.articleId)) {
    return NextResponse.json(
      { error: "Provide bandId or articleId" },
      { status: 422 }
    );
  }

  const { bandId, articleId, bookmark } = parsed.data;

  if (bookmark) {
    await db.bookmark
      .create({
        data: { userId: session.user.id, bandId, articleId },
      })
      .catch(() => null);
  } else {
    await db.bookmark.deleteMany({
      where: { userId: session.user.id, bandId, articleId },
    });
  }

  return NextResponse.json({ ok: true, bookmarked: bookmark });
}
