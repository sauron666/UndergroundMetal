/**
 * Author analytics + revenue share preview.
 *
 * Revenue model (subject to change once Stripe Connect is wired):
 *   - 60% of every premium-tier read accrues to the article author.
 *   - We assume an effective revenue per premium read of €0.05 — derived from
 *     premium subscription price ÷ average reads per subscriber per month.
 *   - The dashboard shows this as a *preview* with a clear disclaimer.
 *
 * Once Connect is hooked up, replace EARNINGS_PER_PREMIUM_READ with the real
 * accrued figure pulled from a payouts ledger table.
 */

import { db } from "@/lib/db";

export const EARNINGS_PER_PREMIUM_READ_EUR = 0.05;
export const AUTHOR_SHARE = 0.6;

export async function getAuthorStats(authorId: string) {
  const articles = await db.article.findMany({
    where: { authorId, status: "PUBLISHED" },
    select: {
      id: true,
      slug: true,
      title: true,
      type: true,
      publishedAt: true,
      _count: {
        select: {
          reads: true,
          votes: true,
          comments: true,
        },
      },
    },
    orderBy: { publishedAt: "desc" },
  });

  if (articles.length === 0) {
    return {
      articles: [] as typeof articles,
      totals: {
        articles: 0,
        reads: 0,
        premiumReads: 0,
        earningsEur: 0,
      },
      perArticle: [] as {
        articleId: string;
        slug: string;
        title: string;
        reads: number;
        premiumReads: number;
        earningsEur: number;
      }[],
    };
  }

  const articleIds = articles.map((a) => a.id);

  const premiumByArticle = await db.articleRead.groupBy({
    by: ["articleId"],
    where: { articleId: { in: articleIds }, premium: true },
    _count: true,
  });
  const premiumMap = new Map(premiumByArticle.map((p) => [p.articleId, p._count]));

  const perArticle = articles.map((a) => {
    const premiumReads = premiumMap.get(a.id) ?? 0;
    const earningsEur =
      premiumReads * EARNINGS_PER_PREMIUM_READ_EUR * AUTHOR_SHARE;
    return {
      articleId: a.id,
      slug: a.slug,
      title: a.title,
      reads: a._count.reads,
      premiumReads,
      earningsEur,
    };
  });

  return {
    articles,
    totals: {
      articles: articles.length,
      reads: perArticle.reduce((s, a) => s + a.reads, 0),
      premiumReads: perArticle.reduce((s, a) => s + a.premiumReads, 0),
      earningsEur: perArticle.reduce((s, a) => s + a.earningsEur, 0),
    },
    perArticle,
  };
}
