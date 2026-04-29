import { db } from "@/lib/db";
import { auth } from "@/auth";

/**
 * Server component that renders an ad placement by slug.
 * Premium users see nothing. Inactive placements render nothing. The placement
 * HTML is whatever an admin pasted into the AdPlacement record (sanitization is
 * the admin's responsibility — in practice you'd plug a vendor tag here).
 */
export async function AdSlot({ slug }: { slug: string }) {
  const session = await auth();
  if (session?.user.tier === "PREMIUM") return null;

  const placement = await db.adPlacement
    .findUnique({ where: { slug } })
    .catch(() => null);
  if (!placement?.active || !placement.html) return null;

  return (
    <aside
      className="my-6 border border-dashed border-border/60 p-4 text-xs uppercase tracking-widest text-muted-foreground rounded-sm"
      data-ad-slot={slug}
    >
      <p className="text-[9px] mb-2">Sponsored</p>
      <div dangerouslySetInnerHTML={{ __html: placement.html }} />
    </aside>
  );
}
