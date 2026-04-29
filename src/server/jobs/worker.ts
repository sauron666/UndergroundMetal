/**
 * Job worker. Polls the Job table for due rows and dispatches to handlers.
 * Run via `pnpm worker` (long-running) or `pnpm worker:once` (CI/cron mode
 * that drains the queue and exits).
 */

import { claimNext, complete, fail } from "./queue";
import { archiveCitation } from "./handlers/archive-citation";
import { recheckCitation } from "./handlers/recheck-citation";
import { embedBand } from "./handlers/embed-band";
import { sendPush } from "./handlers/send-push";
import type { JobKind } from "@prisma/client";

const HANDLERS: Record<JobKind, (payload: unknown) => Promise<unknown>> = {
  ARCHIVE_CITATION: archiveCitation,
  RECHECK_CITATION: recheckCitation,
  EMBED_BAND: embedBand,
  SEND_PUSH: sendPush,
  // Reserved: search reindex is currently inline in the API routes.
  REINDEX_SEARCH: async () => ({ noop: true }),
};

async function processOne(): Promise<boolean> {
  const job = await claimNext();
  if (!job) return false;
  try {
    const fn = HANDLERS[job.kind];
    if (!fn) throw new Error(`no handler for ${job.kind}`);
    const result = await fn(job.payload);
    await complete(job.id, result);
    console.log(`[worker] ${job.kind} ${job.id} OK`);
  } catch (e) {
    console.error(`[worker] ${job.kind} ${job.id} FAILED`, e);
    await fail(job.id, e);
  }
  return true;
}

async function runLoop() {
  console.log("[worker] starting");
  let idle = 0;
  // simple back-pressure: 0ms when busy, exponential up to 30s when idle
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const did = await processOne();
    if (did) {
      idle = 0;
    } else {
      const sleep = Math.min(30_000, 500 * Math.pow(2, idle));
      idle = Math.min(idle + 1, 6);
      await new Promise((r) => setTimeout(r, sleep));
    }
  }
}

async function runOnce() {
  console.log("[worker] draining queue once");
  let processed = 0;
  while (await processOne()) processed += 1;
  console.log(`[worker] drained ${processed}`);
  process.exit(0);
}

if (process.argv.includes("--once")) {
  runOnce().catch((e) => {
    console.error(e);
    process.exit(1);
  });
} else {
  runLoop().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
