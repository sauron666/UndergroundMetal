import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { sendEmail, isEmailConfigured } from "@/server/email/client";
import { magicLinkEmail } from "@/server/email/magic-link";

export const runtime = "nodejs";

const Body = z.object({ email: z.string().email() });

/**
 * Issue a one-time sign-in link.
 *
 * - Always returns 200 to avoid leaking which emails have accounts. If the
 *   address isn't registered, no token is created and no email is sent.
 * - Tokens expire in 15 minutes; old tokens are not invalidated to avoid a
 *   race where the legitimate user clicks an in-flight email.
 */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: true });
  }
  const email = parsed.data.email.toLowerCase().trim();
  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ ok: true });
  }

  const token = crypto.randomBytes(24).toString("hex");
  await db.authToken.create({
    data: {
      userId: user.id,
      kind: "signin",
      token,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    },
  });

  if (isEmailConfigured()) {
    const tmpl = magicLinkEmail({ token });
    sendEmail({
      to: email,
      subject: tmpl.subject,
      html: tmpl.html,
      text: tmpl.text,
    })
      .then(() =>
        db.emailLog.create({
          data: {
            userId: user.id,
            to: email,
            template: "magic-link",
            subject: tmpl.subject,
          },
        })
      )
      .catch((e) => console.error("[magic-link]", e));
  }

  return NextResponse.json({ ok: true, configured: isEmailConfigured() });
}
