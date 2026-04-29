import Link from "next/link";
import { db } from "@/lib/db";

export default async function AdminVenues() {
  const venues = await db.venue.findMany({
    include: { _count: { select: { shows: true } } },
    orderBy: [{ countryCode: "asc" }, { city: "asc" }],
    take: 200,
  });

  return (
    <div>
      <h1 className="font-display text-3xl mb-6">Venues</h1>
      <div className="border border-border rounded-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-card/60 border-b border-border">
            <tr className="text-left text-[10px] uppercase tracking-widest text-muted-foreground">
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">City</th>
              <th className="px-3 py-2">Country</th>
              <th className="px-3 py-2">Shows</th>
            </tr>
          </thead>
          <tbody>
            {venues.map((v) => (
              <tr key={v.id} className="border-b border-border/40">
                <td className="px-3 py-2 font-medium">{v.name}</td>
                <td className="px-3 py-2 text-xs">{v.city}</td>
                <td className="px-3 py-2 font-mono text-xs">{v.countryCode}</td>
                <td className="px-3 py-2 font-mono text-xs">{v._count.shows}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {venues.length === 0 && (
        <p className="text-center text-muted-foreground italic py-12">
          No venues yet.{" "}
          <Link href="/admin/scrape-runs" className="text-primary">
            Run the concerts scraper
          </Link>{" "}
          to populate.
        </p>
      )}
    </div>
  );
}
