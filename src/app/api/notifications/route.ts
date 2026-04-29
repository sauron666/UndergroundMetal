import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const [items, unread] = await Promise.all([
    db.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    db.notification.count({ where: { userId: session.user.id, read: false } }),
  ]);
  return NextResponse.json({ items, unread });
}

const PatchBody = z.object({
  ids: z.array(z.string()).optional(),
  // when ids is omitted + all=true, marks all read
  all: z.boolean().optional(),
});

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = PatchBody.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 422 });
  }
  await db.notification.updateMany({
    where: {
      userId: session.user.id,
      ...(parsed.data.ids && parsed.data.ids.length > 0
        ? { id: { in: parsed.data.ids } }
        : parsed.data.all
        ? {}
        : { id: "_no_op_" }),
    },
    data: { read: true },
  });
  return NextResponse.json({ ok: true });
}
