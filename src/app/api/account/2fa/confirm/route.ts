import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { verify, generateRecoveryCodes } from "@/server/security/totp";

export const runtime = "nodejs";

const Body = z.object({ token: z.string().min(6).max(8) });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user?.totpSecret) {
    return NextResponse.json(
      { error: "Start 2FA setup first" },
      { status: 400 }
    );
  }
  if (user.totpEnabledAt) {
    return NextResponse.json({ error: "Already enabled" }, { status: 409 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 422 });
  }
  if (!verify(parsed.data.token, user.totpSecret)) {
    return NextResponse.json({ error: "Wrong code" }, { status: 401 });
  }

  // Generate recovery codes; store hashed copies, return plaintext to user once.
  const plain = generateRecoveryCodes(10);
  const hashed = await Promise.all(plain.map((c) => bcrypt.hash(c, 10)));

  await db.user.update({
    where: { id: user.id },
    data: { totpEnabledAt: new Date(), recoveryCodes: hashed },
  });

  return NextResponse.json({ ok: true, recoveryCodes: plain });
}
