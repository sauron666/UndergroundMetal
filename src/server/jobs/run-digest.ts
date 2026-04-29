/**
 * Weekly digest dispatcher. Enqueues a SEND_DIGEST job per opted-in user with
 * at least one followed band. Run once a week (cron).
 *
 *   pnpm digest:send
 */

import { db } from "@/lib/db";
import { enqueue } from "./queue";

async function main() {
  const users = await db.user.findMany({
    where: {
      OR: [
        { emailPreference: null },
        { emailPreference: { weeklyDigest: true } },
      ],
      follows: { some: {} },
    },
    select: { id: true },
  });
  let enq = 0;
  for (const u of users) {
    await enqueue("SEND_DIGEST", { userId: u.id });
    enq += 1;
  }
  console.log(`[digest] enqueued ${enq} digests`);
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
