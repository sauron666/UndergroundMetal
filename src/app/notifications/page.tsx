import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Bell, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { MarkAllRead } from "./mark-all-read";

export const metadata: Metadata = { title: "Notifications" };

const KIND_LABEL: Record<string, string> = {
  COMMENT_REPLY: "Reply",
  ARTICLE_PUBLISHED: "New article",
  SHOW_ANNOUNCED: "New show",
  ARTICLE_VOTE: "Vote",
  REPORT_RESOLVED: "Report",
  MENTION: "Mention",
  SYSTEM: "System",
};

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin?next=/notifications");

  const items = await db.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const unread = items.filter((i) => !i.read).length;

  return (
    <div className="container py-10 md:py-14 max-w-3xl">
      <header className="flex items-end justify-between mb-8">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-2 flex items-center gap-1.5">
            <Bell className="h-3 w-3" /> Inbox
          </p>
          <h1 className="font-display text-4xl">Notifications</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {unread > 0 ? `${unread} unread` : "All caught up"}
          </p>
        </div>
        {unread > 0 && <MarkAllRead />}
      </header>

      {items.length === 0 ? (
        <p className="text-center text-muted-foreground italic py-20">
          No notifications yet.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((n) => {
            const Wrapper = n.url ? Link : "div";
            const content = (
              <Card
                className={
                  n.read
                    ? "border-border/40"
                    : "border-primary/40 bg-primary/[0.03]"
                }
              >
                <CardContent className="py-3 flex items-start gap-3">
                  <div
                    className={
                      n.read
                        ? "h-2 w-2 rounded-full bg-transparent border border-border mt-1.5"
                        : "h-2 w-2 rounded-full bg-primary mt-1.5"
                    }
                  />
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <span className="text-[10px] uppercase tracking-widest text-primary font-mono">
                        {KIND_LABEL[n.kind] ?? n.kind}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(n.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm font-medium">{n.title}</p>
                    {n.body && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {n.body}
                      </p>
                    )}
                  </div>
                  {n.read && (
                    <Check className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-1" />
                  )}
                </CardContent>
              </Card>
            );
            return n.url ? (
              <Wrapper key={n.id} href={n.url} className="block">
                {content}
              </Wrapper>
            ) : (
              <div key={n.id}>{content}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
