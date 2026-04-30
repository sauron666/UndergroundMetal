import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const Patch = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).nullable().optional(),
  coverUrl: z.string().url().nullable().optional(),
});

async function requireStaff() {
  const session = await auth();
  if (!session?.user || !["EDITOR", "ADMIN"].includes(session.user.role)) return null;
  return session;
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const parsed = Patch.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 422 });
  }
  const series = await db.articleSeries.update({
    where: { id },
    data: parsed.data,
  });
  return NextResponse.json({ series });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;
  await db.articleSeries.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
