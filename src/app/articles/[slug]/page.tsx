import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { ArticleBody } from "./article-body";
import { Comments } from "@/components/articles/comments";
import { VoteBar } from "@/components/articles/vote-bar";
import { BookmarkButton } from "@/components/bookmarks/bookmark-button";
import { ReadTracker } from "@/components/articles/read-tracker";
import { getCommentTree } from "@/server/articles/comment-tree";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string }>;
}

async function getArticle(slug: string) {
  return db.article
    .findUnique({
      where: { slug },
      include: {
        author: { select: { name: true, username: true, image: true, bio: true } },
        bands: { include: { band: { select: { name: true, slug: true } } } },
        citations: true,
        series: {
          select: {
            id: true,
            slug: true,
            title: true,
            articles: {
              where: { status: "PUBLISHED" },
              orderBy: [{ seriesPart: "asc" }, { publishedAt: "asc" }],
              select: { id: true, slug: true, title: true, seriesPart: true },
            },
          },
        },
      },
    })
    .catch(() => null);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const a = await getArticle(slug);
  if (!a) return { title: "Article not found" };
  return {
    title: a.title,
    description: a.excerpt ?? a.subtitle ?? a.title,
    openGraph: {
      title: a.title,
      description: a.excerpt ?? "",
      type: "article",
      publishedTime: a.publishedAt?.toISOString(),
      authors: [a.author.username ?? a.author.name ?? "anon"],
      images: [
        {
          url: `/og/article/${a.slug}`,
          width: 1200,
          height: 630,
          alt: a.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: a.title,
      description: a.excerpt ?? "",
      images: [`/og/article/${a.slug}`],
    },
  };
}

export default async function ArticlePage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { sort: sortParam } = await searchParams;
  const sort: "best" | "new" | "top" =
    sortParam === "new" || sortParam === "top" ? sortParam : "best";
  const a = await getArticle(slug);
  if (!a || a.status !== "PUBLISHED") notFound();

  const session = await auth();
  const userId = session?.user?.id ?? null;
  const isStaff = !!session && ["EDITOR", "ADMIN"].includes(session.user.role);

  const [comments, votesUp, votesDown, myVote, myBookmark] = await Promise.all([
    getCommentTree(a.id, userId, sort),
    db.vote.count({ where: { articleId: a.id, value: "UP" } }),
    db.vote.count({ where: { articleId: a.id, value: "DOWN" } }),
    userId
      ? db.vote.findUnique({
          where: { userId_articleId: { userId, articleId: a.id } },
        })
      : null,
    userId
      ? db.bookmark.findFirst({
          where: { userId, articleId: a.id },
          select: { id: true },
        })
      : null,
  ]);

  return (
    <article className="container py-10 md:py-14 max-w-3xl">
      <ReadTracker articleId={a.id} />
      <Badge variant="rust" className="mb-4">
        {a.type.toLowerCase()}
      </Badge>
      <h1 className="font-display text-4xl md:text-6xl tracking-tight">
        {a.title}
      </h1>
      {a.subtitle && (
        <p className="mt-3 text-xl text-muted-foreground">{a.subtitle}</p>
      )}
      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground border-y border-border/60 py-4">
        <span>
          by{" "}
          {a.author.username ? (
            <Link
              href={`/u/${a.author.username}`}
              className="text-foreground font-medium hover:text-primary"
            >
              {a.author.username}
            </Link>
          ) : (
            <span className="text-foreground font-medium">
              {a.author.name ?? "anon"}
            </span>
          )}
        </span>
        <span>{a.publishedAt ? formatDate(a.publishedAt) : ""}</span>
        {a.rating != null && (
          <Badge variant="blood">{a.rating}/100</Badge>
        )}
        <div className="ml-auto flex items-center gap-2">
          <Link
            href={`/articles/${a.slug}/print`}
            className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-primary"
          >
            PDF
          </Link>
          <BookmarkButton
            target={{ articleId: a.id }}
            initial={!!myBookmark}
            signedIn={!!userId}
          />
          <VoteBar
            articleId={a.id}
            initialUp={votesUp}
            initialDown={votesDown}
            initialMine={myVote?.value ?? null}
            signedIn={!!userId}
          />
        </div>
        {a.bands.length > 0 && (
          <span>
            ·{" "}
            {a.bands.map((b, i) => (
              <span key={b.bandId}>
                {i > 0 && ", "}
                <Link
                  href={`/bands/${b.band.slug}`}
                  className="text-foreground hover:text-primary"
                >
                  {b.band.name}
                </Link>
              </span>
            ))}
          </span>
        )}
      </div>

      {a.series && (
        <aside className="mt-6 border border-border rounded-sm p-4 bg-card/30">
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-1">
            ⛧ Series
            {a.seriesPart != null ? ` · part ${a.seriesPart}` : ""}
          </p>
          <Link
            href={`/series/${a.series.slug}`}
            className="font-display text-xl hover:text-primary"
          >
            {a.series.title}
          </Link>
          {a.series.articles.length > 1 && (
            <ol className="mt-3 text-xs space-y-1">
              {a.series.articles.map((sa) => (
                <li key={sa.id}>
                  <Link
                    href={`/articles/${sa.slug}`}
                    className={
                      sa.id === a.id
                        ? "text-primary font-medium"
                        : "text-muted-foreground hover:text-foreground"
                    }
                  >
                    {sa.seriesPart != null ? `${sa.seriesPart}. ` : "· "}
                    {sa.title}
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </aside>
      )}

      <div className="prose prose-invert prose-sm md:prose-base max-w-none mt-8">
        <ArticleBody content={a.content} />
      </div>

      {a.citations.length > 0 && (
        <section className="mt-12 pt-8 border-t border-border/60">
          <h2 className="font-display text-xl mb-4">Sources</h2>
          <ol className="space-y-2 list-decimal list-inside text-sm">
            {a.citations.map((c) => (
              <li key={c.id} className="text-muted-foreground">
                <a
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="text-foreground hover:text-primary break-all"
                >
                  {c.title ?? c.url}
                </a>{" "}
                {c.publisher && (
                  <span className="italic">— {c.publisher}</span>
                )}
                <span className="ml-2 text-[10px] uppercase tracking-widest">
                  [{c.kind.toLowerCase()}]
                  {c.archiveUrl && (
                    <>
                      {" · "}
                      <a
                        href={c.archiveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-primary"
                      >
                        archive
                      </a>
                    </>
                  )}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <Comments
        articleId={a.id}
        slug={a.slug}
        initial={comments}
        currentUserId={userId}
        isStaff={isStaff}
        sort={sort}
      />
    </article>
  );
}
