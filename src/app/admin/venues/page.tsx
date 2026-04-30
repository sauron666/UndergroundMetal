import Link from "next/link";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default async function AdminVenues() {
  const venues = await db.venue.findMany({
    include: { _count: { select: { shows: true } } },
    orderBy: [{ countryCode: "asc" }, { city: "asc" }],
    take: 200,
  });

  return (
    <div>
      <header className="flex items-center justify-between mb-6">
        <h1 className="font-display text-3xl">Venues</h1>
        <Button asChild variant="spike">
          <Link href="/admin/venues/new">
            <Plus className="h-3.5 w-3.5" /> New
          </Link>
        </Button>
      </header>
      <div className="border border-border rounded-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-card/60 border-b border-border">
            <tr className="text-left text-[10px] uppercase tracking-widest text-muted-foreground">
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">City</th>
              <th className="px-3 py-2">Country</th>
              <th className="px-3 py-2">Capacity</th>
              <th className="px-3 py-2">Shows</th>
            </tr>
          </thead>
          <tbody>
            {venues.map((v) => (
              <tr key={v.id} className="border-b border-border/40">
                <td className="px-3 py-2 font-medium">
                  <Link
                    href={`/admin/venues/${v.slug}`}
                    className="hover:text-primary"
                  >
                    {v.name}
                  </Link>
                </td>
                <td className="px-3 py-2 text-xs">{v.city}</td>
                <td className="px-3 py-2 font-mono text-xs">{v.countryCode}</td>
                <td className="px-3 py-2 font-mono text-xs">
                  {v.capacity ?? "—"}
                </td>
                <td className="px-3 py-2 font-mono text-xs">
                  {v._count.shows}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {venues.length === 0 && (
        <p className="text-center text-muted-foreground italic py-12">
          No venues yet.
        </p>
      )}
    </div>
  );
}
