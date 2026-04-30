import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Pre-check email+password before submitting to NextAuth, so the UI can ask
 * for a TOTP code as a second step when the user has 2FA enabled. Returns
 * { ok: true, needs2FA: boolean } on success.
 *
 * The same uniform "Invalid credentials" error is returned on any failure to
 * avoid leaking which step rejected the user.
 */

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }
  const user = await db.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
    select: { passwordHash: true, totpEnabledAt: true },
  });
  if (!user?.passwordHash) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }
  const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }
  return NextResponse.json({ ok: true, needs2FA: !!user.totpEnabledAt });
}
