import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { consumeToken, userKey } from "@/server/security/rate-limit";

export const runtime = "nodejs";

const Body = z.object({
  target: z.enum(["ARTICLE", "COMMENT", "BAND", "SHOW"]),
  targetId: z.string(),
  reason: z.string().min(5).max(2000),
  articleId: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // 10 reports / user / hour to prevent moderation-queue flooding.
  if (
    !(await consumeToken({
      key: userKey(session.user.id, "report"),
      capacity: 10,
      refillPerSec: 10 / 3600,
    }))
  ) {
    return NextResponse.json(
      { error: "Too many reports — try again later" },
      { status: 429 }
    );
  }
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten() },
      { status: 422 }
    );
  }
  const report = await db.report.create({
    data: {
      reporterId: session.user.id,
      target: parsed.data.target,
      targetId: parsed.data.targetId,
      reason: parsed.data.reason,
      articleId: parsed.data.articleId,
    },
  });
  return NextResponse.json({ report }, { status: 201 });
}
