import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessagesSquare, Pin, Lock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const metadata: Metadata = {
  title: "Forum",
  description:
    "Open discussion for the underground rock and metal scene — recommendations, gear, local scenes, festivals, releases.",
};

const CATEGORIES = [
  { slug: "GENERAL", label: "General" },
  { slug: "RECOMMENDATIONS", label: "Recommendations" },
  { slug: "GEAR", label: "Gear" },
  { slug: "LOCAL_SCENES", label: "Local scenes" },
  { slug: "FESTIVALS", label: "Festivals" },
  { slug: "RELEASES", label: "Releases" },
  { slug: "META", label: "Meta" },
];

interface PageProps {
  searchParams: Promise<{ cat?: string }>;
}

export default async function ForumIndex({ searchParams }: PageProps) {
  const { cat } = await searchParams;

  const where = {
    hidden: false,
    ...(cat && CATEGORIES.find((c) => c.slug === cat)
      ? { category: cat as never }
      : {}),
  };

  const threads = await db.forumThread
    .findMany({
      where,
      include: {
        author: { select: { username: true, name: true, image: true } },
      },
      orderBy: [{ pinned: "desc" }, { lastPostAt: "desc" }],
      take: 50,
    })
    .catch(() => []);

  return (
    <div className="container py-10 md:py-14 max-w-4xl">
      <header className="flex items-end justify-between mb-8 gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-2 flex items-center gap-1.5">
            <MessagesSquare className="h-3 w-3" /> Forum
          </p>
          <h1 className="font-display text-4xl md:text-5xl">Discussion</h1>
        </div>
        <Button asChild variant="spike">
          <Link href="/forum/new">New thread</Link>
        </Button>
      </header>

      <div className="flex flex-wrap gap-2 mb-6">
        <Link
          href="/forum"
          className={
            !cat
              ? "text-[10px] uppercase tracking-widest text-primary"
              : "text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
          }
        >
          All
        </Link>
        {CATEGORIES.map((c) => (
          <Link
            key={c.slug}
            href={`/forum?cat=${c.slug}`}
            className={
              cat === c.slug
                ? "text-[10px] uppercase tracking-widest text-primary"
                : "text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
            }
          >
            {c.label}
          </Link>
        ))}
      </div>

      {threads.length === 0 ? (
        <p className="text-center text-muted-foreground italic py-20">
          No threads here yet. Start one.
        </p>
      ) : (
        <div className="space-y-2">
          {threads.map((t) => (
            <Link key={t.id} href={`/forum/${t.slug}`} className="block">
              <Card className="hover:border-primary/60 transition-colors">
                <CardContent className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {t.pinned && (
                          <Pin className="h-3 w-3 text-primary shrink-0" />
                        )}
                        {t.locked && (
                          <Lock className="h-3 w-3 text-muted-foreground shrink-0" />
                        )}
                        <Badge variant="outline">
                          {t.category.toLowerCase().replace("_", " ")}
                        </Badge>
                      </div>
                      <p className="font-medium truncate">{t.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        by {t.author.username ?? t.author.name ?? "anon"} ·{" "}
                        {t.postCount} {t.postCount === 1 ? "reply" : "replies"} ·
                        last activity{" "}
                        {formatDistanceToNow(t.lastPostAt, { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
