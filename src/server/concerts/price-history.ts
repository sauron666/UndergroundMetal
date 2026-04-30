/**
 * Record a price observation for a TicketLink. Only writes a new history row
 * when the observed price differs from the most recent stored value (or when
 * availability flips), so the table stays linear in *price changes* rather
 * than poll count.
 *
 * Returns:
 *   - "first": this is the first observation for the link
 *   - "changed": price or availability moved
 *   - "stable": no change, no row written
 *   - "drop": price dropped — caller may want to notify followers
 */

import { db } from "@/lib/db";

export type PriceObservationResult =
  | { kind: "first"; priceMinor: number }
  | { kind: "stable" }
  | { kind: "changed"; from: number; to: number }
  | { kind: "drop"; from: number; to: number };

export async function recordTicketPrice(
  ticketLinkId: string,
  priceMinor: number,
  available: boolean,
  currency: string | null = null
): Promise<PriceObservationResult> {
  const last = await db.ticketPriceHistory.findFirst({
    where: { ticketLinkId },
    orderBy: { observedAt: "desc" },
  });

  // Always update the live priceMinor / lastCheckedAt on TicketLink.
  await db.ticketLink.update({
    where: { id: ticketLinkId },
    data: {
      priceMinor,
      currency: currency ?? undefined,
      available,
      lastCheckedAt: new Date(),
    },
  });

  if (!last) {
    await db.ticketPriceHistory.create({
      data: { ticketLinkId, priceMinor, currency, available },
    });
    return { kind: "first", priceMinor };
  }

  const stable =
    last.priceMinor === priceMinor && last.available === available;
  if (stable) return { kind: "stable" };

  await db.ticketPriceHistory.create({
    data: { ticketLinkId, priceMinor, currency, available },
  });

  if (priceMinor < last.priceMinor) {
    return { kind: "drop", from: last.priceMinor, to: priceMinor };
  }
  return { kind: "changed", from: last.priceMinor, to: priceMinor };
}
