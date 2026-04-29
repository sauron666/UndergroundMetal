/**
 * Periodically re-validate a citation: HEAD the URL and confirm it still
 * returns a successful status. If link rot is detected, mark the citation
 * verified=false so the editorial UI can flag it.
 *
 * Payload: { citationId: string }
 */

import { db } from "@/lib/db";
import { z } from "zod";

const Payload = z.object({ citationId: z.string() });

export async function recheckCitation(payload: unknown) {
  const { citationId } = Payload.parse(payload);
  const citation = await db.citation.findUnique({ where: { id: citationId } });
  if (!citation) throw new Error(`citation not found: ${citationId}`);

  let ok = false;
  try {
    const res = await fetch(citation.url, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
      headers: {
        "User-Agent": "UndergroundMetal/0.1 (+https://undergroundmetal.app)",
      },
    });
    ok = res.ok;
    // Some servers refuse HEAD; fall back to a small GET
    if (!ok && res.status === 405) {
      const r2 = await fetch(citation.url, {
        method: "GET",
        redirect: "follow",
        signal: AbortSignal.timeout(15_000),
      });
      ok = r2.ok;
    }
  } catch {
    ok = false;
  }

  await db.citation.update({
    where: { id: citationId },
    data: {
      verified: ok,
      verifiedAt: new Date(),
    },
  });

  return { ok };
}
