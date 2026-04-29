import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const Patch = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().nullable().optional(),
  kind: z.enum(["BEST_OF", "PRIMER", "STAFF_PICK", "USER"]).optional(),
  year: z.number().int().min(1900).max(2200).nullable().optional(),
  published: z.boolean().optional(),
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

  // If newly publishing and no publishedAt, set it.
  const current = await db.bandList.findUnique({ where: { id } });
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const wasUnpublished = !current.publishedAt;
  const publishedAt =
    parsed.data.published && wasUnpublished
      ? new Date()
      : parsed.data.published === false
      ? null
      : current.publishedAt;

  const list = await db.bandList.update({
    where: { id },
    data: { ...parsed.data, publishedAt },
  });
  return NextResponse.json({ list });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;
  await db.bandList.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
