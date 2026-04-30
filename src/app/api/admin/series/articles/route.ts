import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const Body = z.object({
  seriesId: z.string(),
  articleId: z.string(),
  seriesPart: z.number().int().min(1).max(999).nullable().optional(),
});

async function requireStaff() {
  const session = await auth();
  if (!session?.user || !["EDITOR", "ADMIN"].includes(session.user.role)) return null;
  return session;
}

export async function POST(req: Request) {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 422 });
  }
  const article = await db.article.update({
    where: { id: parsed.data.articleId },
    data: {
      seriesId: parsed.data.seriesId,
      seriesPart: parsed.data.seriesPart ?? null,
    },
    select: { id: true, slug: true, title: true, status: true, seriesPart: true },
  });
  return NextResponse.json({ article });
}

const DeleteBody = z.object({ articleId: z.string() });

export async function DELETE(req: Request) {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const parsed = DeleteBody.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 422 });
  }
  await db.article.update({
    where: { id: parsed.data.articleId },
    data: { seriesId: null, seriesPart: null },
  });
  return NextResponse.json({ ok: true });
}
