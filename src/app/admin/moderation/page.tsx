import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, truncate } from "@/lib/utils";

export const metadata: Metadata = { title: "Moderation queue" };

export default async function ModerationQueue() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");
  if (!["EDITOR", "ADMIN"].includes(session.user.role)) {
    return (
      <div className="container py-20 text-center">
        <h1 className="font-display text-3xl mb-2">Forbidden</h1>
        <p className="text-muted-foreground">
          Editor or admin role required.
        </p>
      </div>
    );
  }

  const [pending, reports] = await Promise.all([
    db.article.findMany({
      where: { status: "IN_REVIEW" },
      include: {
        author: { select: { username: true, name: true } },
        _count: { select: { citations: true } },
        reviewLog: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { updatedAt: "asc" },
    }),
    db.report.findMany({
      where: { status: "OPEN" },
      include: { reporter: { select: { username: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return (
    <div className="container py-10 md:py-14">
      <header className="mb-10">
        <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-2">
          ⛧ Editor
        </p>
        <h1 className="font-display text-4xl md:text-5xl">Moderation queue</h1>
      </header>

      <section className="mb-12">
        <h2 className="font-display text-2xl mb-4">In review ({pending.length})</h2>
        {pending.length === 0 ? (
          <p className="text-muted-foreground italic">All clear.</p>
        ) : (
          <div className="space-y-3">
            {pending.map((a) => (
              <Card key={a.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle>{a.title}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        by {a.author.username ?? a.author.name} ·{" "}
                        {formatDate(a.updatedAt)} · {a._count.citations} sources
                      </p>
                    </div>
                    <Badge variant="rust">{a.type.toLowerCase()}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex items-center justify-between gap-4">
                  <p className="text-sm text-muted-foreground">
                    {truncate(a.excerpt ?? a.contentText ?? "", 200)}
                  </p>
                  <div className="flex gap-2 shrink-0">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/admin/moderation/${a.id}`}>Review</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-display text-2xl mb-4">Open reports ({reports.length})</h2>
        {reports.length === 0 ? (
          <p className="text-muted-foreground italic">No reports.</p>
        ) : (
          <div className="space-y-2">
            {reports.map((r) => (
              <Card key={r.id}>
                <CardContent className="py-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-widest">
                      {r.target} · {r.targetId.slice(0, 8)} · by{" "}
                      {r.reporter.username ?? "anon"}
                    </p>
                    <p className="text-sm mt-1">{r.reason}</p>
                  </div>
                  <Button variant="outline" size="sm">Resolve</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
