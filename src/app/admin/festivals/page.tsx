import Link from "next/link";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default async function AdminFestivals() {
  const festivals = await db.festival
    .findMany({
      include: { _count: { select: { bookings: true } } },
      orderBy: { startDate: "desc" },
      take: 200,
    })
    .catch(() => []);

  return (
    <div>
      <header className="flex items-center justify-between mb-6 gap-2 flex-wrap">
        <h1 className="font-display text-3xl">Festivals</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/festivals/csv">CSV</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/festivals/import">JSON import</Link>
          </Button>
          <Button asChild variant="spike">
            <Link href="/admin/festivals/new">
              <Plus className="h-3.5 w-3.5" /> New
            </Link>
          </Button>
        </div>
      </header>
      <div className="border border-border rounded-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-card/60 border-b border-border">
            <tr className="text-left text-[10px] uppercase tracking-widest text-muted-foreground">
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Country</th>
              <th className="px-3 py-2">Dates</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Bands</th>
            </tr>
          </thead>
          <tbody>
            {festivals.map((f) => (
              <tr key={f.id} className="border-b border-border/40 hover:bg-card/40">
                <td className="px-3 py-2">
                  <Link
                    href={`/admin/festivals/${f.slug}`}
                    className="font-medium hover:text-primary"
                  >
                    {f.name}
                  </Link>
                </td>
                <td className="px-3 py-2 font-mono text-xs">
                  {f.countryCode}
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {formatDate(f.startDate)} – {formatDate(f.endDate)}
                </td>
                <td className="px-3 py-2">
                  <Badge variant="outline">{f.status.toLowerCase()}</Badge>
                </td>
                <td className="px-3 py-2 font-mono text-xs">
                  {f._count.bookings}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {festivals.length === 0 && (
        <p className="text-center text-muted-foreground italic py-12">
          No festivals yet.
        </p>
      )}
    </div>
  );
}
