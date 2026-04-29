import Link from "next/link";
import { getAnalytics } from "@/server/analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AnalyticsPage() {
  const a = await getAnalytics().catch(() => null);
  if (!a) {
    return (
      <div>
        <h1 className="font-display text-3xl mb-6">Analytics</h1>
        <p className="text-muted-foreground italic">
          Database not reachable; analytics need a live connection.
        </p>
      </div>
    );
  }

  const maxSignup = Math.max(1, ...a.signupsByDay.map((d) => d.count));

  return (
    <div>
      <header className="mb-8">
        <h1 className="font-display text-3xl">Analytics</h1>
        <p className="text-xs text-muted-foreground mt-1 font-mono">
          generated {new Date(a.generatedAt).toLocaleString()}
        </p>
      </header>

      <div className="grid sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        <Stat label="Users" value={a.users.total} />
        <Stat label="New 7d" value={a.users.new7d} highlight />
        <Stat label="Premium" value={a.premium.active} highlight />
        <Stat label="Articles" value={a.articles.published} />
        <Stat label="In review" value={a.articles.inReview} highlight={a.articles.inReview > 0} />
        <Stat label="Drafts" value={a.articles.draft} />
      </div>

      <div className="grid sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        <Stat label="Reads (all)" value={a.reads.total.toLocaleString()} />
        <Stat label="Reads 7d" value={a.reads.last7d.toLocaleString()} highlight />
        <Stat label="Reads 30d" value={a.reads.last30d.toLocaleString()} />
        <Stat label="Premium reads 7d" value={a.reads.premium7d.toLocaleString()} highlight />
        <Stat label="Follows total" value={a.follows.total.toLocaleString()} />
        <Stat label="Follows 7d" value={a.follows.new7d.toLocaleString()} highlight />
      </div>

      <div className="grid sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-10">
        <Stat label="Bookmarks" value={a.bookmarks.total.toLocaleString()} />
        <Stat label="Comments" value={a.comments.total.toLocaleString()} />
        <Stat label="Comments 7d" value={a.comments.last7d.toLocaleString()} highlight />
        <Stat label="Forum threads" value={a.forum.threads} />
        <Stat label="Forum posts" value={a.forum.posts} />
        <Stat label="Forum posts 7d" value={a.forum.new7d} highlight />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Signups (last 30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            {a.signupsByDay.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                No signups in this window.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {a.signupsByDay.map((d) => (
                  <li
                    key={d.date}
                    className="flex items-center gap-3 text-xs font-mono"
                  >
                    <span className="text-muted-foreground w-24 shrink-0">
                      {d.date}
                    </span>
                    <span
                      className="bg-primary/40 h-2 rounded-sm"
                      style={{ width: `${(d.count / maxSignup) * 100}%` }}
                    />
                    <span className="ml-auto text-foreground">{d.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Top articles by reads</CardTitle>
            </CardHeader>
            <CardContent>
              {a.topArticles.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No data.</p>
              ) : (
                <ul className="space-y-1.5">
                  {a.topArticles.map((art) => (
                    <li
                      key={art.id}
                      className="flex items-center gap-3 text-xs"
                    >
                      <Link
                        href={`/articles/${art.slug}`}
                        className="flex-1 truncate hover:text-primary"
                      >
                        {art.title}
                      </Link>
                      <span className="font-mono text-muted-foreground">
                        {art.reads}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Top bands by follows</CardTitle>
            </CardHeader>
            <CardContent>
              {a.topBands.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No data.</p>
              ) : (
                <ul className="space-y-1.5">
                  {a.topBands.map((b) => (
                    <li key={b.id} className="flex items-center gap-3 text-xs">
                      <Link
                        href={`/bands/${b.slug}`}
                        className="flex-1 truncate hover:text-primary"
                      >
                        {b.name}
                      </Link>
                      <span className="font-mono text-muted-foreground">
                        {b.follows}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div className="border border-border rounded-sm p-3">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
        {label}
      </p>
      <p
        className={
          highlight
            ? "text-xl font-display text-primary"
            : "text-xl font-display"
        }
      >
        {value}
      </p>
    </div>
  );
}
