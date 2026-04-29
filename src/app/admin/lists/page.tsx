import Link from "next/link";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default async function AdminLists() {
  const lists = await db.bandList
    .findMany({
      include: {
        curator: { select: { username: true, name: true } },
        _count: { select: { items: true } },
      },
      orderBy: { updatedAt: "desc" },
    })
    .catch(() => []);

  return (
    <div>
      <header className="flex items-center justify-between mb-6">
        <h1 className="font-display text-3xl">Curated lists</h1>
        <Button asChild variant="spike">
          <Link href="/admin/lists/new">
            <Plus className="h-3.5 w-3.5" /> New
          </Link>
        </Button>
      </header>
      <div className="border border-border rounded-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-card/60 border-b border-border">
            <tr className="text-left text-[10px] uppercase tracking-widest text-muted-foreground">
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Kind</th>
              <th className="px-3 py-2">Year</th>
              <th className="px-3 py-2">Bands</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {lists.map((l) => (
              <tr key={l.id} className="border-b border-border/40 hover:bg-card/40">
                <td className="px-3 py-2">
                  <Link
                    href={`/admin/lists/${l.slug}`}
                    className="font-medium hover:text-primary"
                  >
                    {l.title}
                  </Link>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    by {l.curator.username ?? l.curator.name ?? "?"} ·{" "}
                    {formatDate(l.updatedAt)}
                  </p>
                </td>
                <td className="px-3 py-2 text-xs">
                  {l.kind.replace("_", " ").toLowerCase()}
                </td>
                <td className="px-3 py-2 font-mono text-xs">
                  {l.year ?? "—"}
                </td>
                <td className="px-3 py-2 font-mono text-xs">
                  {l._count.items}
                </td>
                <td className="px-3 py-2">
                  {l.published ? (
                    <Badge variant="blood">published</Badge>
                  ) : (
                    <Badge variant="ghost">draft</Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {lists.length === 0 && (
        <p className="text-center text-muted-foreground italic py-12">
          No lists yet.
        </p>
      )}
    </div>
  );
}
