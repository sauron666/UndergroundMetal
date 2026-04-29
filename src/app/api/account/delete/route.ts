import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { auth, signOut } from "@/auth";
import { db } from "@/lib/db";
import { deleteAccount } from "@/server/account/delete";

export const runtime = "nodejs";

const Body = z.object({
  // For credentials accounts we require the current password as a sanity check.
  // OAuth-only accounts pass `confirm: "DELETE"` instead.
  current: z.string().optional(),
  confirm: z.literal("DELETE"),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          "Type DELETE in the confirmation field; if your account uses a password, supply it too.",
      },
      { status: 422 }
    );
  }

  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (user.passwordHash) {
    if (!parsed.data.current) {
      return NextResponse.json(
        { error: "Password required" },
        { status: 401 }
      );
    }
    const ok = await bcrypt.compare(parsed.data.current, user.passwordHash);
    if (!ok) {
      return NextResponse.json(
        { error: "Wrong password" },
        { status: 401 }
      );
    }
  }

  await deleteAccount(user.id);

  // Best-effort sign-out — the underlying session row is gone anyway
  await signOut({ redirect: false }).catch(() => null);

  return NextResponse.json({ ok: true });
}
