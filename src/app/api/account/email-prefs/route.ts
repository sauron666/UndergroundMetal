import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const Body = z.object({
  weeklyDigest: z.boolean(),
  newShowAlerts: z.boolean(),
  newArticleAlerts: z.boolean(),
  productUpdates: z.boolean(),
});

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 422 });
  }
  await db.emailPreference.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      ...parsed.data,
      unsubscribeToken: crypto.randomBytes(24).toString("hex"),
    },
    update: parsed.data,
  });
  return NextResponse.json({ ok: true });
}
