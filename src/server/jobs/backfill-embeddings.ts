/**
 * Enqueue an EMBED_BAND job for every band that doesn't yet have an embedding
 * (or whose signature has changed). Run once after major catalog imports.
 *
 *   pnpm embeddings:backfill
 */

import { db } from "@/lib/db";
import { enqueue } from "./queue";

async function main() {
  const bands = await db.band.findMany({ select: { id: true } });
  let queued = 0;
  for (const b of bands) {
    await enqueue("EMBED_BAND", { bandId: b.id });
    queued += 1;
  }
  console.log(`[backfill] enqueued ${queued} embedding jobs`);
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
