import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getAuthorStats, EARNINGS_PER_PREMIUM_READ_EUR, AUTHOR_SHARE } from "@/server/author-stats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Coins, Eye, MessageSquare, ArrowBigUp } from "lucide-react";

export const metadata: Metadata = { title: "Author dashboard" };

export default async function AuthorDashboard() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin?next=/author");
  if (!["AUTHOR", "EDITOR", "ADMIN"].includes(session.user.role)) {
    return (
      <div className="container py-20 text-center">
        <h1 className="font-display text-3xl mb-2">Author role required</h1>
        <p className="text-muted-foreground">
          Reach out to an editor to be promoted, or pitch a piece via{" "}
          <Link href="/articles/new" className="text-primary hover:underline">
            /articles/new
          </Link>
          .
        </p>
      </div>
    );
  }

  const stats = await getAuthorStats(session.user.id);
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "EUR",
    }).format(n);

  return (
    <div className="container py-10 md:py-14 max-w-4xl">
      <header className="mb-8">
        <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-2">
          ⛧ Author
        </p>
        <h1 className="font-display text-4xl md:text-5xl">Your work.</h1>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <Stat label="Articles" value={stats.totals.articles} />
        <Stat label="Total reads" value={stats.totals.reads.toLocaleString()} icon={Eye} />
        <Stat label="Premium reads" value={stats.totals.premiumReads.toLocaleString()} highlight />
        <Stat label="Earnings (preview)" value={fmt(stats.totals.earningsEur)} highlight icon={Coins} />
      </div>

      <Card className="mb-8 border-dashed">
        <CardContent className="py-4 text-xs text-muted-foreground">
          <p className="font-medium text-foreground mb-1">Revenue share preview</p>
          <p>
            Authors earn {(AUTHOR_SHARE * 100).toFixed(0)}% of premium-tier
            reads attributed to their pieces. Effective rate per premium read:{" "}
            <span className="font-mono text-foreground">
              {fmt(EARNINGS_PER_PREMIUM_READ_EUR)}
            </span>
            . This is a preview — actual payouts go live once Stripe Connect is
            wired up.
          </p>
        </CardContent>
      </Card>

      {stats.perArticle.length === 0 ? (
        <p className="text-center text-muted-foreground italic py-12">
          You haven't published anything yet.{" "}
          <Link href="/articles/new" className="text-primary hover:underline">
            Pitch a piece
          </Link>
          .
        </p>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Per-article performance</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr className="text-left text-[10px] uppercase tracking-widest text-muted-foreground">
                  <th className="px-4 py-2">Article</th>
                  <th className="px-4 py-2 text-right">Reads</th>
                  <th className="px-4 py-2 text-right">Premium</th>
                  <th className="px-4 py-2 text-right">Earnings</th>
                </tr>
              </thead>
              <tbody>
                {stats.perArticle.map((a) => (
                  <tr
                    key={a.articleId}
                    className="border-b border-border/40 hover:bg-card/40"
                  >
                    <td className="px-4 py-2">
                      <Link
                        href={`/articles/${a.slug}`}
                        className="hover:text-primary"
                      >
                        {a.title}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-xs">
                      {a.reads.toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-xs">
                      {a.premiumReads.toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-xs text-primary">
                      {fmt(a.earningsEur)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
  icon?: typeof Eye;
}) {
  return (
    <div className="border border-border rounded-sm p-4">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-1.5">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </p>
      <p
        className={
          highlight
            ? "text-2xl font-display text-primary"
            : "text-2xl font-display"
        }
      >
        {value}
      </p>
    </div>
  );
}
