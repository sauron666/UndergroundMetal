import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { sendEmail, isEmailConfigured } from "@/server/email/client";
import { welcomeEmail } from "@/server/email/templates";

export const runtime = "nodejs";

const Body = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(24).regex(/^[a-zA-Z0-9_-]+$/),
  password: z.string().min(8).max(128),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const { email, username, password } = parsed.data;

  const existing = await db.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Email or username already taken" },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await db.user.create({
    data: {
      email,
      username,
      name: username,
      passwordHash,
      role: "READER",
      emailPreference: {
        create: {
          unsubscribeToken: crypto.randomBytes(24).toString("hex"),
        },
      },
    },
    select: { id: true, email: true, username: true },
  });

  // Send welcome email best-effort
  if (isEmailConfigured()) {
    const tmpl = welcomeEmail({ name: username });
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
            template: "welcome",
            subject: tmpl.subject,
          },
        })
      )
      .catch((e) => console.error("[welcome email]", e));
  }

  return NextResponse.json({ user }, { status: 201 });
}
