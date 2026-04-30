import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { sendMessage } from "@/server/messages";
import { consumeToken, userKey } from "@/server/security/rate-limit";

export const runtime = "nodejs";

async function requireMember(threadId: string, userId: string) {
  const thread = await db.directMessageThread.findUnique({
    where: { id: threadId },
    include: { members: true },
  });
  if (!thread) return null;
  const me = thread.members.find((m) => m.userId === userId);
  if (!me) return null;
  const other = thread.members.find((m) => m.userId !== userId);
  if (!other) return null;
  return { thread, me, other };
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ threadId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { threadId } = await ctx.params;
  const access = await requireMember(threadId, session.user.id);
  if (!access) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const messages = await db.directMessage.findMany({
    where: { threadId },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  // Mark this thread as read on the server so the bell badge stays honest.
  await db.directMessageThreadMember.update({
    where: {
      threadId_userId: { threadId, userId: session.user.id },
    },
    data: { lastReadAt: new Date() },
  });

  return NextResponse.json({ messages });
}

const Body = z.object({ body: z.string().min(1).max(4000) });

export async function POST(
  req: Request,
  ctx: { params: Promise<{ threadId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { threadId } = await ctx.params;
  const access = await requireMember(threadId, session.user.id);
  if (!access) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Anti-spam: 30 messages per user per 10 min.
  if (
    !(await consumeToken({
      key: userKey(session.user.id, "dm-send"),
      capacity: 30,
      refillPerSec: 30 / 600,
    }))
  ) {
    return NextResponse.json(
      { error: "Too many messages — slow down" },
      { status: 429 }
    );
  }

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 422 });
  }

  const message = await sendMessage({
    threadId,
    senderId: session.user.id,
    body: parsed.data.body,
    recipientId: access.other.userId,
  });
  return NextResponse.json({ message }, { status: 201 });
}
