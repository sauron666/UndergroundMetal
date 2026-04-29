import Link from "next/link";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminOverview() {
  const [bands, articles, pending, shows, scrapeRuns, jobs] = await Promise.all([
    db.band.count().catch(() => 0),
    db.article.count({ where: { status: "PUBLISHED" } }).catch(() => 0),
    db.article.count({ where: { status: "IN_REVIEW" } }).catch(() => 0),
    db.show.count({ where: { date: { gte: new Date() } } }).catch(() => 0),
    db.scrapeRun
      .findMany({ orderBy: { startedAt: "desc" }, take: 5 })
      .catch(() => []),
    db.job
      .groupBy({ by: ["status"], _count: true })
      .catch(() => []),
  ]);

  return (
    <div>
      <h1 className="font-display text-3xl mb-6">Overview</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <Stat label="Bands" value={bands} />
        <Stat label="Articles" value={articles} />
        <Stat label="In review" value={pending} highlight={pending > 0} />
        <Stat label="Upcoming shows" value={shows} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent scrape runs</CardTitle>
          </CardHeader>
          <CardContent>
            {scrapeRuns.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No runs yet.</p>
            ) : (
              <ul className="space-y-2 text-xs font-mono">
                {scrapeRuns.map((r) => (
                  <li key={r.id} className="flex justify-between gap-2">
                    <span>
                      [{r.status}] {r.source.toLowerCase()}{" "}
                      <span className="text-muted-foreground">
                        {r.target.slice(0, 50)}
                      </span>
                    </span>
                    <span className="text-muted-foreground">
                      seen={r.itemsSeen} new={r.itemsNew}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/admin/scrape-runs"
              className="text-[10px] uppercase tracking-widest text-primary hover:text-blood-glow mt-3 inline-block"
            >
              View all →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Job queue</CardTitle>
          </CardHeader>
          <CardContent>
            {jobs.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Idle.</p>
            ) : (
              <ul className="space-y-2 text-xs font-mono">
                {jobs.map((j) => (
                  <li key={j.status} className="flex justify-between">
                    <span>{j.status.toLowerCase()}</span>
                    <span className="text-muted-foreground">{j._count}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
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
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className="border border-border rounded-sm p-4">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
        {label}
      </p>
      <p
        className={
          highlight
            ? "text-2xl font-display text-primary"
            : "text-2xl font-display"
        }
      >
        {value.toLocaleString()}
      </p>
    </div>
  );
}
