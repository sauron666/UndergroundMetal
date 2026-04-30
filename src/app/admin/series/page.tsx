import Link from "next/link";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default async function AdminSeries() {
  const series = await db.articleSeries
    .findMany({
      include: { _count: { select: { articles: true } } },
      orderBy: { updatedAt: "desc" },
    })
    .catch(() => []);

  return (
    <div>
      <header className="flex items-center justify-between mb-6">
        <h1 className="font-display text-3xl">Article series</h1>
        <Button asChild variant="spike">
          <Link href="/admin/series/new">
            <Plus className="h-3.5 w-3.5" /> New
          </Link>
        </Button>
      </header>
      <div className="border border-border rounded-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-card/60 border-b border-border">
            <tr className="text-left text-[10px] uppercase tracking-widest text-muted-foreground">
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Slug</th>
              <th className="px-3 py-2">Articles</th>
              <th className="px-3 py-2">Updated</th>
            </tr>
          </thead>
          <tbody>
            {series.map((s) => (
              <tr key={s.id} className="border-b border-border/40">
                <td className="px-3 py-2 font-medium">
                  <Link
                    href={`/admin/series/${s.slug}`}
                    className="hover:text-primary"
                  >
                    {s.title}
                  </Link>
                </td>
                <td className="px-3 py-2 font-mono text-xs">{s.slug}</td>
                <td className="px-3 py-2 font-mono text-xs">
                  {s._count.articles}
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {formatDate(s.updatedAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {series.length === 0 && (
        <p className="text-center text-muted-foreground italic py-12">
          No series yet.
        </p>
      )}
    </div>
  );
}
