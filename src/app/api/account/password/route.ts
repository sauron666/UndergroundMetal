import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const Body = z.object({
  current: z.string(),
  next: z.string().min(8).max(128),
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

  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user?.passwordHash) {
    return NextResponse.json(
      { error: "No password is set on this account (OAuth-only)" },
      { status: 400 }
    );
  }

  const ok = await bcrypt.compare(parsed.data.current, user.passwordHash);
  if (!ok) {
    return NextResponse.json(
      { error: "Current password is wrong" },
      { status: 401 }
    );
  }

  const passwordHash = await bcrypt.hash(parsed.data.next, 12);
  await db.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });
  return NextResponse.json({ ok: true });
}
