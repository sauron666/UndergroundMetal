/**
 * Archive a citation URL via the Wayback Machine.
 *
 * The Internet Archive offers a public "save page now" endpoint at
 *   https://web.archive.org/save/<URL>
 * that returns a redirect to the archived snapshot. No auth required for
 * basic snapshots. The response location header contains the snapshot URL.
 *
 * Payload: { citationId: string }
 */

import { db } from "@/lib/db";
import { z } from "zod";

const Payload = z.object({ citationId: z.string() });

export async function archiveCitation(payload: unknown) {
  const { citationId } = Payload.parse(payload);

  const citation = await db.citation.findUnique({ where: { id: citationId } });
  if (!citation) throw new Error(`citation not found: ${citationId}`);

  const target = `https://web.archive.org/save/${citation.url}`;
  const res = await fetch(target, {
    method: "GET",
    redirect: "manual",
    headers: {
      "User-Agent": "UndergroundMetal/0.1 (+https://undergroundmetal.app)",
    },
  });

  // Wayback returns 302 with Location: /web/<timestamp>/<url>
  let archiveUrl: string | null = null;
  const loc = res.headers.get("location");
  if (loc) {
    archiveUrl = loc.startsWith("http")
      ? loc
      : `https://web.archive.org${loc}`;
  } else if (res.status === 200) {
    // Some responses already include the snapshot URL in a Content-Location
    archiveUrl =
      res.headers.get("content-location") ??
      `https://web.archive.org/web/*/${citation.url}`;
  }

  if (!archiveUrl) {
    throw new Error(`wayback responded ${res.status} without snapshot URL`);
  }

  await db.citation.update({
    where: { id: citationId },
    data: {
      archiveUrl,
      verified: true,
      verifiedAt: new Date(),
    },
  });

  return { archiveUrl };
}
