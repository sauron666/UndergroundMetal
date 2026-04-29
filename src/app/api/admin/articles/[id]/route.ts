/**
 * Editor moderation actions on a single article.
 *
 *   PATCH /api/admin/articles/:id  body: { action: "publish" | "request_changes" | "reject", notes?: string }
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { publishArticle } from "@/server/articles/publish";

export const runtime = "nodejs";

const Body = z.object({
  action: z.enum(["publish", "request_changes", "reject"]),
  notes: z.string().max(2000).optional(),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["EDITOR", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const article = await db.article.findUnique({ where: { id } });
  if (!article) return NextResponse.json({ error: "Not found" }, { status: 404 });

  switch (parsed.data.action) {
    case "publish": {
      const updated = await publishArticle(id, session.user.id);
      return NextResponse.json({ article: { id: updated.id, slug: updated.slug, status: updated.status } });
    }
    case "request_changes": {
      await db.article.update({ where: { id }, data: { status: "DRAFT" } });
      await db.moderationEvent.create({
        data: {
          articleId: id,
          editorId: session.user.id,
          verdict: "CHANGES_REQUESTED",
          notes: parsed.data.notes,
        },
      });
      return NextResponse.json({ ok: true });
    }
    case "reject": {
      await db.article.update({ where: { id }, data: { status: "REJECTED" } });
      await db.moderationEvent.create({
        data: {
          articleId: id,
          editorId: session.user.id,
          verdict: "REJECTED",
          notes: parsed.data.notes,
        },
      });
      return NextResponse.json({ ok: true });
    }
  }
}
