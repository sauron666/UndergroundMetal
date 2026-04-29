import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const Body = z.object({
  articleId: z.string(),
  body: z.string().min(1).max(4000),
  parentId: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten() },
      { status: 422 }
    );
  }

  // Confirm the article exists and is published (no commenting on drafts)
  const article = await db.article.findUnique({
    where: { id: parsed.data.articleId },
    select: { id: true, status: true },
  });
  if (!article || article.status !== "PUBLISHED") {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }

  // If parentId is set, validate it belongs to the same article
  if (parsed.data.parentId) {
    const parent = await db.comment.findUnique({
      where: { id: parsed.data.parentId },
      select: { articleId: true },
    });
    if (!parent || parent.articleId !== parsed.data.articleId) {
      return NextResponse.json({ error: "Invalid parent comment" }, { status: 400 });
    }
  }

  const comment = await db.comment.create({
    data: {
      articleId: parsed.data.articleId,
      userId: session.user.id,
      parentId: parsed.data.parentId,
      body: parsed.data.body,
    },
    include: {
      user: { select: { id: true, username: true, name: true, image: true } },
    },
  });

  return NextResponse.json({ comment }, { status: 201 });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const comment = await db.comment.findUnique({ where: { id } });
  if (!comment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOwner = comment.userId === session.user.id;
  const isStaff = ["EDITOR", "ADMIN"].includes(session.user.role);
  if (!isOwner && !isStaff) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Soft-hide rather than delete — keeps thread structure intact
  await db.comment.update({ where: { id }, data: { hidden: true } });
  return NextResponse.json({ ok: true });
}
