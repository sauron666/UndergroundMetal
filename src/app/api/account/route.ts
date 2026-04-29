import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const Body = z.object({
  username: z
    .string()
    .min(3)
    .max(24)
    .regex(/^[a-zA-Z0-9_-]+$/)
    .nullable()
    .optional(),
  name: z.string().max(100).nullable().optional(),
  bio: z.string().max(500).nullable().optional(),
  image: z.string().url().nullable().optional(),
});

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten() },
      { status: 422 }
    );
  }

  // Username uniqueness — only check if changing
  if (parsed.data.username) {
    const taken = await db.user.findFirst({
      where: { username: parsed.data.username, NOT: { id: session.user.id } },
      select: { id: true },
    });
    if (taken) {
      return NextResponse.json({ error: "Username taken" }, { status: 409 });
    }
  }

  const user = await db.user.update({
    where: { id: session.user.id },
    data: parsed.data,
    select: { id: true, username: true, name: true, bio: true, image: true },
  });

  return NextResponse.json({ user });
}
