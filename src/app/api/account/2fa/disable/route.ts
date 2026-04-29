import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const Body = z.object({
  // Require the current password as a sanity check (account-level setting).
  current: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user?.totpEnabledAt) {
    return NextResponse.json({ error: "Not enabled" }, { status: 400 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 422 });
  }
  if (user.passwordHash) {
    if (!parsed.data.current) {
      return NextResponse.json({ error: "Password required" }, { status: 401 });
    }
    const ok = await bcrypt.compare(parsed.data.current, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Wrong password" }, { status: 401 });
    }
  }

  await db.user.update({
    where: { id: user.id },
    data: { totpSecret: null, totpEnabledAt: null, recoveryCodes: [] },
  });
  return NextResponse.json({ ok: true });
}
