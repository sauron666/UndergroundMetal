import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Bookmarks" };

export default async function BookmarksPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin?next=/bookmarks");

  const bookmarks = await db.bookmark.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      band: {
        select: {
          slug: true,
          name: true,
          countryCode: true,
          formedYear: true,
          genres: { include: { genre: true } },
        },
      },
      article: {
        select: {
          slug: true,
          title: true,
          excerpt: true,
          type: true,
          publishedAt: true,
        },
      },
    },
  });

  const bandBookmarks = bookmarks.filter((b) => b.band);
  const articleBookmarks = bookmarks.filter((b) => b.article);

  return (
    <div className="container py-10 md:py-14 max-w-3xl">
      <header className="mb-8">
        <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-2">
          ⛧ Saved
        </p>
        <h1 className="font-display text-4xl">Bookmarks</h1>
      </header>

      {bookmarks.length === 0 ? (
        <p className="text-center text-muted-foreground italic py-20">
          You haven't bookmarked anything yet.
        </p>
      ) : (
        <div className="space-y-10">
          {bandBookmarks.length > 0 && (
            <section>
              <h2 className="font-display text-2xl mb-4">
                Bands ({bandBookmarks.length})
              </h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {bandBookmarks.map(
                  (b) =>
                    b.band && (
                      <Link
                        key={b.id}
                        href={`/bands/${b.band.slug}`}
                        className="block"
                      >
                        <Card className="hover:border-primary/60 transition-colors h-full">
                          <CardContent className="py-3">
                            <p className="font-medium">{b.band.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">
                              [{b.band.countryCode ?? "—"}]
                              {b.band.formedYear ? ` · ${b.band.formedYear}` : ""}
                            </p>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {b.band.genres.slice(0, 2).map((g) => (
                                <Badge key={g.genreId} variant="outline">
                                  {g.genre.name}
                                </Badge>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    )
                )}
              </div>
            </section>
          )}

          {articleBookmarks.length > 0 && (
            <section>
              <h2 className="font-display text-2xl mb-4">
                Articles ({articleBookmarks.length})
              </h2>
              <div className="space-y-2">
                {articleBookmarks.map(
                  (b) =>
                    b.article && (
                      <Link
                        key={b.id}
                        href={`/articles/${b.article.slug}`}
                        className="block"
                      >
                        <Card className="hover:border-primary/60 transition-colors">
                          <CardContent className="py-3">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="rust">
                                {b.article.type.toLowerCase()}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground ml-auto">
                                {b.article.publishedAt
                                  ? formatDate(b.article.publishedAt)
                                  : ""}
                              </span>
                            </div>
                            <p className="font-medium">{b.article.title}</p>
                            {b.article.excerpt && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {b.article.excerpt}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      </Link>
                    )
                )}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
