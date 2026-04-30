import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Liveness + readiness probe.
 *
 * GET /api/health
 *   200 { ok: true, db: "ok" } when the process can serve and the DB ping
 *       succeeds.
 *   503 { ok: false, db: "error" } when Postgres is unreachable.
 *
 * For Kubernetes / Vercel cron health checks, point liveness at this URL.
 */
export async function GET() {
  let dbOk = false;
  let dbError: string | undefined;
  try {
    await db.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch (e) {
    dbError = e instanceof Error ? e.message : "unknown";
  }
  const status = dbOk ? 200 : 503;
  return NextResponse.json(
    {
      ok: dbOk,
      db: dbOk ? "ok" : "error",
      dbError,
      uptime: Math.round(process.uptime()),
      ts: new Date().toISOString(),
      version: process.env.NEXT_PUBLIC_BUILD_SHA ?? "dev",
    },
    { status }
  );
}
