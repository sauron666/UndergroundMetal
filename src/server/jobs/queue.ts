import { db } from "@/lib/db";
import type { JobKind, Prisma } from "@prisma/client";

/**
 * Tiny DB-backed job queue. Enqueueing is fire-and-forget; consumption happens
 * in `worker.ts`. We deliberately avoid Redis at this scale.
 */
export async function enqueue(
  kind: JobKind,
  payload: Prisma.InputJsonValue,
  opts: { runAt?: Date; maxAttempts?: number } = {}
) {
  return db.job.create({
    data: {
      kind,
      payload,
      runAt: opts.runAt ?? new Date(),
      maxAttempts: opts.maxAttempts ?? 5,
    },
  });
}

/**
 * Atomically claim the next due job. Uses SELECT ... FOR UPDATE SKIP LOCKED
 * via raw SQL so multiple workers can run concurrently without grabbing the
 * same row. Returns null if the queue is empty.
 */
export async function claimNext(): Promise<{
  id: string;
  kind: JobKind;
  payload: unknown;
  attempts: number;
  maxAttempts: number;
} | null> {
  const rows = await db.$queryRaw<
    Array<{ id: string; kind: JobKind; payload: unknown; attempts: number; maxAttempts: number }>
  >`
    UPDATE "Job"
    SET status = 'RUNNING', "startedAt" = NOW(), attempts = attempts + 1
    WHERE id = (
      SELECT id FROM "Job"
      WHERE status = 'PENDING' AND "runAt" <= NOW()
      ORDER BY "runAt" ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    RETURNING id, kind, payload, attempts, "maxAttempts";
  `;
  return rows[0] ?? null;
}

export async function complete(jobId: string, result: unknown) {
  await db.job.update({
    where: { id: jobId },
    data: {
      status: "DONE",
      result: (result ?? null) as Prisma.InputJsonValue,
      finishedAt: new Date(),
    },
  });
}

export async function fail(jobId: string, error: unknown, retryable = true) {
  const job = await db.job.findUnique({ where: { id: jobId } });
  if (!job) return;
  const msg = error instanceof Error ? error.message : String(error);
  const willRetry = retryable && job.attempts < job.maxAttempts;
  // exponential backoff: 1m, 2m, 4m, 8m, 16m
  const delayMs = Math.min(16 * 60_000, 60_000 * Math.pow(2, job.attempts - 1));
  await db.job.update({
    where: { id: jobId },
    data: {
      status: willRetry ? "PENDING" : "FAILED",
      lastError: msg,
      runAt: willRetry ? new Date(Date.now() + delayMs) : job.runAt,
      finishedAt: willRetry ? null : new Date(),
    },
  });
}
