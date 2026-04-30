import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { findOrCreateThread } from "@/server/messages";

export const runtime = "nodejs";

const Body = z.object({
  // Either a target user id or a username to start a thread with.
  username: z.string().optional(),
  userId: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success || (!parsed.data.username && !parsed.data.userId)) {
    return NextResponse.json(
      { error: "username or userId required" },
      { status: 422 }
    );
  }

  const target = await db.user.findFirst({
    where: parsed.data.userId
      ? { id: parsed.data.userId }
      : { username: parsed.data.username! },
    select: { id: true },
  });
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (target.id === session.user.id) {
    return NextResponse.json(
      { error: "Cannot DM yourself" },
      { status: 400 }
    );
  }

  const thread = await findOrCreateThread(session.user.id, target.id);
  return NextResponse.json({ threadId: thread.id });
}
