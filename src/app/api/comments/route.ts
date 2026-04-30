import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { notify } from "@/server/notifications";
import { consumeToken, userKey } from "@/server/security/rate-limit";

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

  // Anti-spam: 30 comments / user / 10 min.
  if (
    !(await consumeToken({
      key: userKey(session.user.id, "comment-post"),
      capacity: 30,
      refillPerSec: 30 / 600,
    }))
  ) {
    return NextResponse.json(
      { error: "Slow down — too many comments" },
      { status: 429 }
    );
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

  // Notify the parent comment's author of a reply (if not self-reply)
  if (parsed.data.parentId) {
    const parent = await db.comment.findUnique({
      where: { id: parsed.data.parentId },
      include: {
        article: { select: { slug: true, title: true } },
      },
    });
    if (parent && parent.userId !== session.user.id) {
      await notify({
        userId: parent.userId,
        kind: "COMMENT_REPLY",
        title: `New reply on "${parent.article.title}"`,
        body: parsed.data.body.slice(0, 160),
        url: `/articles/${parent.article.slug}#c-${comment.id}`,
        refKey: `comment-${comment.id}`,
      });
    }
  }

  return NextResponse.json({ comment }, { status: 201 });
}

const PatchBody = z.object({
  id: z.string(),
  body: z.string().min(1).max(4000),
});

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = PatchBody.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 422 });
  }

  const comment = await db.comment.findUnique({ where: { id: parsed.data.id } });
  if (!comment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const isOwner = comment.userId === session.user.id;
  const isStaff = ["EDITOR", "ADMIN"].includes(session.user.role);
  if (!isOwner && !isStaff) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (comment.hidden) {
    return NextResponse.json(
      { error: "Cannot edit hidden comment" },
      { status: 409 }
    );
  }
  if (comment.body === parsed.data.body) {
    return NextResponse.json({ ok: true, comment });
  }

  const updated = await db.$transaction(async (tx) => {
    await tx.commentEdit.create({
      data: { commentId: comment.id, previousBody: comment.body },
    });
    return tx.comment.update({
      where: { id: comment.id },
      data: { body: parsed.data.body, editedAt: new Date() },
      include: {
        user: { select: { id: true, username: true, name: true, image: true } },
      },
    });
  });

  return NextResponse.json({ ok: true, comment: updated });
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
