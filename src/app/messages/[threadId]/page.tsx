import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ThreadView } from "./thread-view";

export const metadata: Metadata = { title: "Message thread" };

interface PageProps {
  params: Promise<{ threadId: string }>;
}

export default async function ThreadPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const { threadId } = await params;
  const thread = await db.directMessageThread.findUnique({
    where: { id: threadId },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, username: true, name: true, image: true },
          },
        },
      },
      messages: { orderBy: { createdAt: "asc" }, take: 200 },
    },
  });
  if (!thread) notFound();

  const me = thread.members.find((m) => m.userId === session.user.id);
  if (!me) notFound();

  // Mark read on entry.
  await db.directMessageThreadMember
    .update({
      where: { threadId_userId: { threadId, userId: session.user.id } },
      data: { lastReadAt: new Date() },
    })
    .catch(() => null);

  const other = thread.members.find((m) => m.userId !== session.user.id);

  return (
    <div className="container py-10 md:py-14 max-w-3xl">
      <nav className="text-xs text-muted-foreground mb-4">
        <Link href="/messages" className="hover:text-foreground">
          Messages
        </Link>
        <span className="mx-2">/</span>
        <Link
          href={
            other?.user.username ? `/u/${other.user.username}` : "#"
          }
          className="text-foreground hover:text-primary"
        >
          {other?.user.username ?? other?.user.name ?? "user"}
        </Link>
      </nav>

      <ThreadView
        threadId={thread.id}
        currentUserId={session.user.id}
        otherName={other?.user.username ?? other?.user.name ?? "user"}
        initial={thread.messages.map((m) => ({
          id: m.id,
          body: m.body,
          senderId: m.senderId,
          createdAt: m.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
