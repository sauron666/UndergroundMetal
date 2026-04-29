import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { sendEmail, isEmailConfigured } from "@/server/email/client";
import { newsletterConfirmEmail } from "@/server/email/newsletter";

export const runtime = "nodejs";

const Body = z.object({
  email: z.string().email(),
  source: z.string().max(64).optional(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const email = parsed.data.email.toLowerCase().trim();

  // Idempotent: re-issue confirm token if PENDING; no-op if already CONFIRMED.
  const existing = await db.newsletterSubscriber.findUnique({ where: { email } });
  if (existing && existing.status === "CONFIRMED") {
    return NextResponse.json({ ok: true, status: "already-subscribed" });
  }

  const confirmToken = crypto.randomBytes(24).toString("hex");
  const unsubscribeToken = existing?.unsubscribeToken ?? crypto.randomBytes(24).toString("hex");

  const sub = await db.newsletterSubscriber.upsert({
    where: { email },
    create: {
      email,
      status: "PENDING",
      confirmToken,
      unsubscribeToken,
      source: parsed.data.source ?? null,
    },
    update: {
      status: "PENDING",
      confirmToken,
    },
  });

  if (isEmailConfigured()) {
    const tmpl = newsletterConfirmEmail({ confirmToken });
    await sendEmail({
      to: email,
      subject: tmpl.subject,
      html: tmpl.html,
      text: tmpl.text,
    }).catch((e) => console.error("[newsletter] send failed", e));
  }

  return NextResponse.json({ ok: true, status: sub.status, configured: isEmailConfigured() });
}
