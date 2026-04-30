import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const Patch = z.object({
  name: z.string().min(1).max(200).optional(),
  bornYear: z.number().int().min(1900).max(2100).nullable().optional(),
  countryCode: z.string().length(2).nullable().optional(),
  bio: z.string().max(5000).nullable().optional(),
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
  const person = await db.person.update({
    where: { id },
    data: parsed.data,
  });
  return NextResponse.json({ person });
}
