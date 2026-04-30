import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { notify } from "@/server/notifications";
import { consumeToken, userKey } from "@/server/security/rate-limit";

export const runtime = "nodejs";

const Body = z.object({
  body: z.string().min(1).max(20_000),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // 30 forum posts / user / 10 min.
  if (
    !(await consumeToken({
      key: userKey(session.user.id, "forum-post"),
      capacity: 30,
      refillPerSec: 30 / 600,
    }))
  ) {
    return NextResponse.json(
      { error: "Slow down — too many posts" },
      { status: 429 }
    );
  }
  const { id } = await ctx.params;

  const thread = await db.forumThread.findUnique({
    where: { id },
    select: { id: true, slug: true, locked: true, hidden: true, authorId: true, title: true },
  });
  if (!thread || thread.hidden) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (thread.locked) {
    return NextResponse.json({ error: "Thread is locked" }, { status: 423 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten() },
      { status: 422 }
    );
  }

  // Atomic: post + update counters in a transaction
  const post = await db.$transaction(async (tx) => {
    const created = await tx.forumPost.create({
      data: {
        threadId: thread.id,
        authorId: session.user.id,
        body: parsed.data.body,
      },
    });
    await tx.forumThread.update({
      where: { id: thread.id },
      data: {
        postCount: { increment: 1 },
        lastPostAt: created.createdAt,
      },
    });
    return created;
  });

  // Notify the thread author (unless replying to self)
  if (thread.authorId !== session.user.id) {
    await notify({
      userId: thread.authorId,
      kind: "COMMENT_REPLY",
      title: `New reply on "${thread.title}"`,
      body: parsed.data.body.slice(0, 160),
      url: `/forum/${thread.slug}`,
      refKey: `forum-post-${post.id}`,
    });
  }

  return NextResponse.json({ post }, { status: 201 });
}
