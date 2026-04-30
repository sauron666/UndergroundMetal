/**
 * 1:1 direct messages between users.
 *
 * - canonicalKey is "min(userA,userB):max(userA,userB)" so a single row
 *   represents the pairing regardless of who initiates first.
 * - Notifications fire to the recipient using the existing notify() helper
 *   (kind: SYSTEM — DMs aren't muteable as a class).
 */

import { db } from "@/lib/db";
import { notify } from "@/server/notifications";

function pairKey(a: string, b: string): string {
  return [a, b].sort().join(":");
}

export async function findOrCreateThread(userA: string, userB: string) {
  if (userA === userB) throw new Error("cannot DM yourself");
  const key = pairKey(userA, userB);
  const existing = await db.directMessageThread.findUnique({
    where: { canonicalKey: key },
  });
  if (existing) return existing;
  return db.directMessageThread.create({
    data: {
      canonicalKey: key,
      members: {
        create: [{ userId: userA }, { userId: userB }],
      },
    },
  });
}

export async function sendMessage(opts: {
  threadId: string;
  senderId: string;
  body: string;
  recipientId: string;
}) {
  const message = await db.$transaction(async (tx) => {
    const m = await tx.directMessage.create({
      data: {
        threadId: opts.threadId,
        senderId: opts.senderId,
        body: opts.body,
      },
    });
    await tx.directMessageThread.update({
      where: { id: opts.threadId },
      data: { lastMessageAt: m.createdAt },
    });
    // Update sender's lastReadAt so their own message doesn't count as unread.
    await tx.directMessageThreadMember.update({
      where: {
        threadId_userId: {
          threadId: opts.threadId,
          userId: opts.senderId,
        },
      },
      data: { lastReadAt: m.createdAt },
    });
    return m;
  });

  notify({
    userId: opts.recipientId,
    kind: "SYSTEM",
    title: "New message",
    body: opts.body.slice(0, 160),
    url: `/messages/${opts.threadId}`,
    refKey: `dm-${message.id}`,
  }).catch(() => null);

  return message;
}
