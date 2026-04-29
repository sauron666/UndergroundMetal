import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const Body = z.object({
  articleId: z.string(),
  // null = clear vote
  value: z.enum(["UP", "DOWN"]).nullable(),
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

  const { articleId, value } = parsed.data;

  if (value === null) {
    await db.vote.deleteMany({
      where: { userId: session.user.id, articleId },
    });
  } else {
    await db.vote.upsert({
      where: { userId_articleId: { userId: session.user.id, articleId } },
      create: { userId: session.user.id, articleId, value },
      update: { value },
    });
  }

  // Aggregate counts
  const [up, down] = await Promise.all([
    db.vote.count({ where: { articleId, value: "UP" } }),
    db.vote.count({ where: { articleId, value: "DOWN" } }),
  ]);

  return NextResponse.json({ up, down, mine: value });
}
