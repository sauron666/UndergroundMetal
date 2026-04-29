import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const Body = z.object({
  // null clears the rating
  value: z.number().int().min(1).max(10).nullable(),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 422 });
  }

  if (parsed.data.value === null) {
    await db.releaseRating.deleteMany({
      where: { releaseId: id, userId: session.user.id },
    });
  } else {
    await db.releaseRating.upsert({
      where: { releaseId_userId: { releaseId: id, userId: session.user.id } },
      create: { releaseId: id, userId: session.user.id, value: parsed.data.value },
      update: { value: parsed.data.value },
    });
  }

  const agg = await db.releaseRating.aggregate({
    where: { releaseId: id },
    _avg: { value: true },
    _count: true,
  });
  return NextResponse.json({
    avg: agg._avg.value,
    count: agg._count,
    mine: parsed.data.value,
  });
}
