/**
 * Lightweight cron-style scheduler that runs alongside the job worker.
 *
 * Each scheduled task has:
 *   - id: stable identifier so we can checkpoint last-run in the DB
 *   - intervalMs: minimum gap between executions
 *   - run(): the work itself; usually enqueues per-entity Job rows
 *
 * The scheduler stores its checkpoints inline in a singleton ScheduleState
 * row keyed by id. Multiple worker processes coordinate through the row's
 * timestamp via UPDATE ... WHERE lastRunAt < threshold so only one runs.
 *
 * Tasks that fire here (defined below):
 *   - digest.weekly      Sunday 09:00 UTC → enqueue per-user SEND_DIGEST
 *   - citations.recheck  Daily 04:00 UTC → enqueue RECHECK_CITATION for old cites
 *   - cleanup.tokens     Hourly → delete expired AuthTokens
 *   - cleanup.jobs       Daily 02:00 UTC → prune DONE jobs older than 14d
 */

import { db } from "@/lib/db";
import { enqueue } from "./queue";

interface Task {
  id: string;
  intervalMs: number;
  run: () => Promise<void>;
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const TASKS: Task[] = [
  {
    id: "digest.weekly",
    // Once a week. Worker only runs the body if it's Sunday 09:00 UTC ±1h.
    intervalMs: 6 * DAY,
    run: async () => {
      const now = new Date();
      const sunday = now.getUTCDay() === 0;
      const hour = now.getUTCHours();
      if (!sunday || hour < 8 || hour > 10) return;

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
      for (const u of users) {
        await enqueue("SEND_DIGEST", { userId: u.id });
      }
      console.log(`[cron] digest.weekly enqueued ${users.length}`);
    },
  },
  {
    id: "newsletter.weekly",
    intervalMs: 6 * DAY,
    run: async () => {
      const now = new Date();
      const sunday = now.getUTCDay() === 0;
      const hour = now.getUTCHours();
      // Send 30 minutes after the per-user digest tick so they don't collide.
      if (!sunday || hour < 9 || hour > 11) return;

      const subs = await db.newsletterSubscriber.findMany({
        where: { status: "CONFIRMED" },
        select: { id: true },
      });
      for (const s of subs) {
        await enqueue("SEND_NEWSLETTER", { subscriberId: s.id });
      }
      console.log(`[cron] newsletter.weekly enqueued ${subs.length}`);
    },
  },
  {
    id: "citations.recheck",
    // Once a day. Worker only acts at 04:00 UTC ±1h to spread load.
    intervalMs: 23 * HOUR,
    run: async () => {
      const hour = new Date().getUTCHours();
      if (hour < 3 || hour > 5) return;

      // Re-check 100 oldest verified citations per run
      const stale = await db.citation.findMany({
        where: { verified: true },
        orderBy: { verifiedAt: "asc" },
        take: 100,
        select: { id: true },
      });
      for (const c of stale) {
        await enqueue("RECHECK_CITATION", { citationId: c.id });
      }
      console.log(`[cron] citations.recheck enqueued ${stale.length}`);
    },
  },
  {
    id: "cleanup.tokens",
    intervalMs: HOUR,
    run: async () => {
      const r = await db.authToken.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });
      if (r.count > 0) console.log(`[cron] cleanup.tokens ${r.count}`);
    },
  },
  {
    id: "cleanup.jobs",
    intervalMs: 23 * HOUR,
    run: async () => {
      const hour = new Date().getUTCHours();
      if (hour < 1 || hour > 3) return;

      const cutoff = new Date(Date.now() - 14 * DAY);
      const r = await db.job.deleteMany({
        where: { status: "DONE", finishedAt: { lt: cutoff } },
      });
      if (r.count > 0) console.log(`[cron] cleanup.jobs ${r.count}`);
    },
  },
];

/**
 * Try to claim a task: returns true if THIS worker is responsible for running
 * it now, false if another worker has it or it's not due. Backed by a single
 * upsert with a conditional WHERE so multi-worker is safe.
 */
async function tryClaim(taskId: string, intervalMs: number): Promise<boolean> {
  const cutoff = new Date(Date.now() - intervalMs);
  const updated = await db.scheduleState
    .updateMany({
      where: {
        id: taskId,
        lastRunAt: { lt: cutoff },
      },
      data: { lastRunAt: new Date() },
    })
    .catch(() => ({ count: 0 }));
  if (updated.count > 0) return true;

  // First run: create the row only if it doesn't exist
  const created = await db.scheduleState
    .create({
      data: { id: taskId, lastRunAt: new Date() },
    })
    .catch(() => null);
  return !!created;
}

export async function tickScheduler(): Promise<void> {
  for (const t of TASKS) {
    if (!(await tryClaim(t.id, t.intervalMs))) continue;
    try {
      await t.run();
    } catch (e) {
      console.error(`[cron] ${t.id} failed`, e);
    }
  }
}
