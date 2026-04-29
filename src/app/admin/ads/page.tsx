import { db } from "@/lib/db";
import { AdsManager } from "./manager";

export default async function AdminAds() {
  const placements = await db.adPlacement.findMany({
    orderBy: { slug: "asc" },
  });
  return (
    <div>
      <h1 className="font-display text-3xl mb-6">Ad placements</h1>
      <p className="text-sm text-muted-foreground max-w-2xl mb-6">
        Each placement is identified by a stable <code>slug</code> referenced by
        the <code>&lt;AdSlot&gt;</code> component. The HTML is rendered as-is —
        sanitise vendor tags before pasting them.
      </p>
      <AdsManager
        initial={placements.map((p) => ({
          id: p.id,
          slug: p.slug,
          name: p.name,
          html: p.html,
          active: p.active,
        }))}
      />
    </div>
  );
}
