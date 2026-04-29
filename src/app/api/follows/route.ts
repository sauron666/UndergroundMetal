import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const Body = z.object({
  bandId: z.string(),
  follow: z.boolean(),
});

export async function POST(req: Request) {
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

  const { bandId, follow } = parsed.data;
  if (follow) {
    await db.follow
      .upsert({
        where: { userId_bandId: { userId: session.user.id, bandId } },
        create: { userId: session.user.id, bandId },
        update: {},
      })
      .catch(() => null);
  } else {
    await db.follow
      .delete({ where: { userId_bandId: { userId: session.user.id, bandId } } })
      .catch(() => null);
  }

  const count = await db.follow.count({ where: { bandId } });
  return NextResponse.json({ ok: true, following: follow, count });
}
