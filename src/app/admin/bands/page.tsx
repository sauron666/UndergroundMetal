import Link from "next/link";
import { db } from "@/lib/db";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";

export default async function AdminBands({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const bands = await db.band.findMany({
    where: q
      ? { name: { contains: q, mode: "insensitive" } }
      : {},
    include: { genres: { include: { genre: true } } },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <header className="flex items-center justify-between mb-6 gap-4">
        <h1 className="font-display text-3xl">Bands</h1>
        <form action="/admin/bands" className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              name="q"
              defaultValue={q ?? ""}
              placeholder="Search bands..."
              className="pl-9 w-64"
            />
          </div>
          <Button type="submit" size="sm" variant="outline">
            Search
          </Button>
        </form>
      </header>

      <div className="border border-border rounded-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-card/60 border-b border-border">
            <tr className="text-left text-[10px] uppercase tracking-widest text-muted-foreground">
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Country</th>
              <th className="px-3 py-2">Year</th>
              <th className="px-3 py-2">Genres</th>
              <th className="px-3 py-2">Heaviness</th>
              <th className="px-3 py-2">Underground</th>
              <th className="px-3 py-2">Verified</th>
            </tr>
          </thead>
          <tbody>
            {bands.map((b) => (
              <tr
                key={b.id}
                className="border-b border-border/40 hover:bg-card/40"
              >
                <td className="px-3 py-2">
                  <Link
                    href={`/admin/bands/${b.slug}`}
                    className="font-medium hover:text-primary"
                  >
                    {b.name}
                  </Link>
                </td>
                <td className="px-3 py-2 font-mono text-xs">
                  {b.countryCode ?? "—"}
                </td>
                <td className="px-3 py-2 font-mono text-xs">
                  {b.formedYear ?? "—"}
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {b.genres.slice(0, 2).map((g) => (
                      <Badge key={g.genreId} variant="outline">
                        {g.genre.name}
                      </Badge>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-2 font-mono text-xs">
                  {b.heaviness}/10
                </td>
                <td className="px-3 py-2 font-mono text-xs">
                  {b.undergroundScore}/10
                </td>
                <td className="px-3 py-2">
                  {b.verified ? (
                    <Badge variant="blood">verified</Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {bands.length === 0 && (
        <p className="text-center text-muted-foreground italic py-12">
          No bands match.
        </p>
      )}
    </div>
  );
}
