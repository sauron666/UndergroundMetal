import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistance, truncate } from "@/lib/utils";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesIndex() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin?next=/messages");

  const memberships = await db.directMessageThreadMember.findMany({
    where: { userId: session.user.id, archived: false },
    include: {
      thread: {
        include: {
          members: {
            where: { NOT: { userId: session.user.id } },
            include: {
              user: {
                select: { id: true, username: true, name: true, image: true },
              },
            },
          },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
    },
    orderBy: { thread: { lastMessageAt: "desc" } },
  });

  return (
    <div className="container py-10 md:py-14 max-w-3xl">
      <header className="mb-8">
        <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-2">
          ⛧ Messages
        </p>
        <h1 className="font-display text-4xl">Inbox</h1>
      </header>

      {memberships.length === 0 ? (
        <p className="text-center text-muted-foreground italic py-16">
          No conversations yet. Visit a user&apos;s profile to start one.
        </p>
      ) : (
        <div className="space-y-2">
          {memberships.map((m) => {
            const other = m.thread.members[0]?.user;
            const last = m.thread.messages[0];
            const unread =
              last &&
              last.senderId !== session.user.id &&
              (!m.lastReadAt || last.createdAt > m.lastReadAt);
            return (
              <Link
                key={m.threadId}
                href={`/messages/${m.threadId}`}
                className="block"
              >
                <Card
                  className={
                    unread
                      ? "border-primary/40 bg-primary/[0.03]"
                      : "hover:border-primary/60"
                  }
                >
                  <CardContent className="py-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="font-medium">
                        {other?.username ?? other?.name ?? "user"}
                      </p>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistance(m.thread.lastMessageAt)}
                      </span>
                    </div>
                    {last ? (
                      <p className="text-xs text-muted-foreground mt-1">
                        {last.senderId === session.user.id ? "You: " : ""}
                        {truncate(last.body, 140)}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">
                        no messages yet
                      </p>
                    )}
                    {unread && (
                      <Badge variant="blood" className="mt-2">
                        new
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
