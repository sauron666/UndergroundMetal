import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

async function requireStaff() {
  const session = await auth();
  if (!session?.user) return null;
  if (!["EDITOR", "ADMIN"].includes(session.user.role)) return null;
  return session;
}

const Patch = z.object({
  title: z.string().min(1).max(200).optional(),
  type: z
    .enum(["FULL_LENGTH", "EP", "DEMO", "SPLIT", "COMPILATION", "LIVE", "SINGLE"])
    .optional(),
  year: z.number().int().min(1900).max(2100).nullable().optional(),
  releaseDate: z.string().datetime().nullable().optional(),
  coverUrl: z.string().url().nullable().optional(),
  bandcampUrl: z.string().url().nullable().optional(),
  spotifyId: z.string().nullable().optional(),
  description: z.string().max(5000).nullable().optional(),
  trackCount: z.number().int().min(0).max(500).nullable().optional(),
  durationSec: z.number().int().min(0).nullable().optional(),
});

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
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten() },
      { status: 422 }
    );
  }
  const { releaseDate, ...rest } = parsed.data;
  const release = await db.release.update({
    where: { id },
    data: {
      ...rest,
      ...(releaseDate !== undefined
        ? { releaseDate: releaseDate ? new Date(releaseDate) : null }
        : {}),
    },
  });
  return NextResponse.json({ release });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;
  await db.release.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
