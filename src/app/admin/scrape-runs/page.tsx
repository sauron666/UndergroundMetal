import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

export default async function ScrapeRunsPage() {
  const runs = await db.scrapeRun.findMany({
    orderBy: { startedAt: "desc" },
    take: 200,
  });

  return (
    <div>
      <h1 className="font-display text-3xl mb-6">Scrape runs</h1>
      <div className="border border-border rounded-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-card/60 border-b border-border">
            <tr className="text-left text-[10px] uppercase tracking-widest text-muted-foreground">
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Source</th>
              <th className="px-3 py-2">Target</th>
              <th className="px-3 py-2">Seen</th>
              <th className="px-3 py-2">New</th>
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2">Error</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r) => (
              <tr key={r.id} className="border-b border-border/40 hover:bg-card/40">
                <td className="px-3 py-2">
                  <Badge
                    variant={
                      r.status === "OK"
                        ? "blood"
                        : r.status === "EMPTY"
                        ? "ghost"
                        : "default"
                    }
                  >
                    {r.status.toLowerCase()}
                  </Badge>
                </td>
                <td className="px-3 py-2 font-mono text-xs">
                  {r.source.toLowerCase()}
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground max-w-md truncate">
                  {r.target}
                </td>
                <td className="px-3 py-2 font-mono text-xs">{r.itemsSeen}</td>
                <td className="px-3 py-2 font-mono text-xs">{r.itemsNew}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {formatDistanceToNow(r.startedAt, { addSuffix: true })}
                </td>
                <td className="px-3 py-2 text-xs text-destructive max-w-xs truncate">
                  {r.error}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {runs.length === 0 && (
        <p className="text-center text-muted-foreground italic py-12">
          No runs yet. Run <code>pnpm scrape:news</code> or{" "}
          <code>pnpm scrape:concerts</code>.
        </p>
      )}
    </div>
  );
}
