import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const Body = z.object({
  value: z.enum(["UP", "DOWN"]).nullable(),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 422 });
  }

  if (parsed.data.value === null) {
    await db.commentVote.deleteMany({
      where: { userId: session.user.id, commentId: id },
    });
  } else {
    await db.commentVote.upsert({
      where: { userId_commentId: { userId: session.user.id, commentId: id } },
      create: {
        userId: session.user.id,
        commentId: id,
        value: parsed.data.value,
      },
      update: { value: parsed.data.value },
    });
  }

  const [up, down] = await Promise.all([
    db.commentVote.count({ where: { commentId: id, value: "UP" } }),
    db.commentVote.count({ where: { commentId: id, value: "DOWN" } }),
  ]);
  return NextResponse.json({ up, down, mine: parsed.data.value });
}
