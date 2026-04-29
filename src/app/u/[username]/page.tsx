import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatDistance } from "@/lib/utils";

interface PageProps {
  params: Promise<{ username: string }>;
}

async function getUser(username: string) {
  return db.user
    .findFirst({
      where: { username },
      select: {
        id: true,
        username: true,
        name: true,
        bio: true,
        image: true,
        role: true,
        createdAt: true,
      },
    })
    .catch(() => null);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  const u = await getUser(username);
  if (!u) return { title: "User not found" };
  return {
    title: u.username ?? u.name ?? "User",
    description: u.bio ?? `${u.username} on Underground Metal`,
  };
}

export default async function ProfilePage({ params }: PageProps) {
  const { username } = await params;
  const user = await getUser(username);
  if (!user) notFound();

  const session = await auth();
  const isMe = session?.user?.id === user.id;

  const [articles, follows, comments, threads, articleCount] = await Promise.all([
    db.article.findMany({
      where: { authorId: user.id, status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      take: 10,
      select: {
        id: true,
        slug: true,
        title: true,
        type: true,
        publishedAt: true,
        excerpt: true,
        rating: true,
      },
    }),
    db.follow.findMany({
      where: { userId: user.id },
      include: {
        band: { select: { slug: true, name: true, countryCode: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    db.comment.findMany({
      where: { userId: user.id, hidden: false },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        article: { select: { slug: true, title: true } },
      },
    }),
    db.forumThread.findMany({
      where: { authorId: user.id, hidden: false },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, slug: true, title: true, postCount: true, createdAt: true },
    }),
    db.article.count({ where: { authorId: user.id, status: "PUBLISHED" } }),
  ]);

  return (
    <div className="container py-10 md:py-14 max-w-4xl">
      <header className="flex flex-col sm:flex-row gap-6 items-start mb-10 pb-10 border-b border-border/60">
        <div className="h-24 w-24 rounded-sm bg-card border border-border overflow-hidden flex items-center justify-center text-3xl font-display text-primary shrink-0">
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.image} alt="" className="w-full h-full object-cover" />
          ) : (
            (user.username ?? "?").slice(0, 2).toUpperCase()
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-1">
            ⛧ {user.role.toLowerCase()}
          </p>
          <h1 className="font-display text-4xl tracking-tight">
            {user.username ?? user.name ?? "user"}
          </h1>
          {user.name && user.username && user.name !== user.username && (
            <p className="text-sm text-muted-foreground mt-1">{user.name}</p>
          )}
          {user.bio && (
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-prose">
              {user.bio}
            </p>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            joined {formatDate(user.createdAt)} · {articleCount} article
            {articleCount === 1 ? "" : "s"} · {follows.length} follow
            {follows.length === 1 ? "" : "s"}
          </p>
          {isMe && (
            <Link
              href="/account"
              className="text-xs uppercase tracking-widest text-primary hover:text-blood-glow mt-3 inline-block"
            >
              Edit profile →
            </Link>
          )}
        </div>
      </header>

      <div className="grid lg:grid-cols-[1fr_280px] gap-8">
        <div className="space-y-10">
          {articles.length > 0 && (
            <section>
              <h2 className="font-display text-2xl mb-4">Articles</h2>
              <div className="space-y-2">
                {articles.map((a) => (
                  <Link key={a.id} href={`/articles/${a.slug}`} className="block">
                    <Card className="hover:border-primary/60 transition-colors">
                      <CardContent className="py-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="rust">{a.type.toLowerCase()}</Badge>
                          {a.rating != null && (
                            <Badge variant="blood">{a.rating}/100</Badge>
                          )}
                          <span className="text-[10px] text-muted-foreground ml-auto">
                            {a.publishedAt ? formatDate(a.publishedAt) : ""}
                          </span>
                        </div>
                        <p className="font-medium">{a.title}</p>
                        {a.excerpt && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {a.excerpt}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {threads.length > 0 && (
            <section>
              <h2 className="font-display text-2xl mb-4">Forum threads</h2>
              <div className="space-y-2">
                {threads.map((t) => (
                  <Link key={t.id} href={`/forum/${t.slug}`} className="block">
                    <Card className="hover:border-primary/60 transition-colors">
                      <CardContent className="py-3">
                        <p className="font-medium">{t.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {t.postCount} {t.postCount === 1 ? "reply" : "replies"} ·{" "}
                          {formatDistance(t.createdAt)}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {comments.length > 0 && (
            <section>
              <h2 className="font-display text-2xl mb-4">Recent comments</h2>
              <div className="space-y-2">
                {comments.map((c) => (
                  <Link
                    key={c.id}
                    href={`/articles/${c.article.slug}`}
                    className="block"
                  >
                    <Card className="hover:border-primary/60 transition-colors">
                      <CardContent className="py-3">
                        <p className="text-xs text-muted-foreground mb-1">
                          on{" "}
                          <span className="text-foreground">
                            {c.article.title}
                          </span>{" "}
                          · {formatDistance(c.createdAt)}
                        </p>
                        <p className="text-sm line-clamp-2">{c.body}</p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {articles.length === 0 &&
            comments.length === 0 &&
            threads.length === 0 && (
              <p className="text-muted-foreground italic text-center py-12">
                Nothing to show yet.
              </p>
            )}
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Following{" "}
                <span className="text-muted-foreground">({follows.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {follows.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  No follows yet.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {follows.map((f) => (
                    <li key={f.bandId}>
                      <Link
                        href={`/bands/${f.band.slug}`}
                        className="text-sm hover:text-primary flex justify-between items-baseline gap-2"
                      >
                        <span className="truncate">{f.band.name}</span>
                        {f.band.countryCode && (
                          <span className="text-[10px] font-mono text-muted-foreground">
                            [{f.band.countryCode}]
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
