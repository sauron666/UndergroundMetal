import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ReplyForm } from "./reply-form";
import { Pin, Lock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getThread(slug: string) {
  return db.forumThread
    .findUnique({
      where: { slug },
      include: {
        author: { select: { id: true, username: true, name: true, image: true } },
        posts: {
          where: { hidden: false },
          orderBy: { createdAt: "asc" },
          include: {
            author: { select: { id: true, username: true, name: true, image: true } },
          },
        },
      },
    })
    .catch(() => null);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const t = await getThread(slug);
  if (!t) return { title: "Thread not found" };
  return {
    title: t.title,
    description: t.body.slice(0, 160),
  };
}

export default async function ForumThreadPage({ params }: PageProps) {
  const { slug } = await params;
  const thread = await getThread(slug);
  if (!thread || thread.hidden) notFound();

  const session = await auth();

  return (
    <div className="container py-10 md:py-14 max-w-3xl">
      <nav className="text-xs text-muted-foreground mb-4">
        <Link href="/forum" className="hover:text-foreground">
          Forum
        </Link>
        <span className="mx-2">/</span>
        <Badge variant="outline">
          {thread.category.toLowerCase().replace("_", " ")}
        </Badge>
      </nav>

      <header className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          {thread.pinned && <Pin className="h-4 w-4 text-primary" />}
          {thread.locked && <Lock className="h-4 w-4 text-muted-foreground" />}
        </div>
        <h1 className="font-display text-3xl md:text-4xl">{thread.title}</h1>
        <p className="text-xs text-muted-foreground mt-2">
          by {thread.author.username ?? thread.author.name ?? "anon"} ·{" "}
          {formatDistanceToNow(thread.createdAt, { addSuffix: true })} ·{" "}
          {thread.posts.length} {thread.posts.length === 1 ? "reply" : "replies"}
        </p>
      </header>

      <Card className="mb-6">
        <CardContent className="py-4">
          <p className="text-sm whitespace-pre-wrap leading-relaxed">
            {thread.body}
          </p>
        </CardContent>
      </Card>

      <div className="space-y-3 mb-8">
        {thread.posts.map((p) => (
          <Card key={p.id}>
            <CardContent className="py-3">
              <div className="text-xs text-muted-foreground mb-1.5">
                <span className="text-foreground font-medium">
                  {p.author.username ?? p.author.name ?? "anon"}
                </span>{" "}
                · {formatDistanceToNow(p.createdAt, { addSuffix: true })}
              </div>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">
                {p.body}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {thread.locked ? (
        <p className="text-center italic text-muted-foreground">
          Thread is locked.
        </p>
      ) : session?.user ? (
        <ReplyForm threadId={thread.id} />
      ) : (
        <p className="text-sm text-muted-foreground italic text-center">
          <Link href="/auth/signin" className="text-primary hover:underline">
            Sign in
          </Link>{" "}
          to reply.
        </p>
      )}
    </div>
  );
}
