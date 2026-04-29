import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const Patch = z.object({
  name: z.string().min(1).max(200).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  city: z.string().min(1).max(120).optional(),
  countryCode: z.string().length(2).optional(),
  venueName: z.string().nullable().optional(),
  websiteUrl: z.string().url().nullable().optional(),
  posterUrl: z.string().url().nullable().optional(),
  description: z.string().nullable().optional(),
  status: z
    .enum(["ANNOUNCED", "CONFIRMED", "CANCELLED", "POSTPONED", "PAST"])
    .optional(),
  undergroundScore: z.number().int().min(1).max(10).optional(),
  verified: z.boolean().optional(),
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
  const { startDate, endDate, ...rest } = parsed.data;
  const festival = await db.festival.update({
    where: { id },
    data: {
      ...rest,
      ...(startDate ? { startDate: new Date(startDate) } : {}),
      ...(endDate ? { endDate: new Date(endDate) } : {}),
    },
  });
  return NextResponse.json({ festival });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;
  await db.festival.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
