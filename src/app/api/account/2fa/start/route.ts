import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { generateSecret } from "@/server/security/totp";

export const runtime = "nodejs";

/**
 * Returns a fresh TOTP secret + provisioning URI. The secret is held only on
 * the server until the user submits a valid code via /confirm. We DO write
 * the pending secret onto the User row so the confirmation flow can verify
 * without keeping client-side state.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (user.totpEnabledAt) {
    return NextResponse.json(
      { error: "2FA already enabled. Disable first." },
      { status: 409 }
    );
  }

  const { secret, uri } = generateSecret(user.email);
  await db.user.update({
    where: { id: user.id },
    data: { totpSecret: secret },
  });
  return NextResponse.json({ secret, uri });
}
