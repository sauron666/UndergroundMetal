/**
 * /api/click — affiliate redirect endpoint.
 *
 * Logs a click in AffiliateClick (with hashed IP for GDPR), then 302s the user
 * to the affiliate-tagged URL. UI components use /api/click instead of linking
 * directly so we can attribute revenue.
 *
 * Usage:
 *   /api/click?id=<TicketLink id>
 */

import crypto from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { buildTicketUrl } from "@/server/affiliate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function hashIp(ip: string | null) {
  if (!ip) return null;
  return crypto.createHash("sha256").update(`um:${ip}`).digest("hex").slice(0, 24);
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const link = await db.ticketLink.findUnique({ where: { id } }).catch(() => null);
  if (!link) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const userId = req.headers.get("x-user-id"); // populated by middleware later
  const target = buildTicketUrl(link.provider, link.url, {
    userId,
    campaign: "concert-listing",
  });

  // Fire-and-forget audit row
  db.affiliateClick
    .create({
      data: {
        ticketId: link.id,
        provider: link.provider,
        url: target,
        userId: userId ?? null,
        referer: req.headers.get("referer"),
        userAgent: req.headers.get("user-agent"),
        ipHash: hashIp(req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null),
      },
    })
    .catch((e) => console.error("[click] audit failed", e));

  return NextResponse.redirect(target, { status: 302 });
}
