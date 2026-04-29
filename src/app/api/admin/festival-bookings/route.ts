import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

async function requireStaff() {
  const session = await auth();
  if (!session?.user || !["EDITOR", "ADMIN"].includes(session.user.role)) return null;
  return session;
}

const Body = z.object({
  festivalId: z.string(),
  bandId: z.string(),
  position: z.number().int().min(0).max(999).default(99),
  day: z.number().int().min(1).max(31).nullable().optional(),
  stage: z.string().max(120).nullable().optional(),
});

export async function POST(req: Request) {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 422 });
  }
  const booking = await db.festivalBooking.upsert({
    where: {
      festivalId_bandId: {
        festivalId: parsed.data.festivalId,
        bandId: parsed.data.bandId,
      },
    },
    create: parsed.data,
    update: {
      position: parsed.data.position,
      day: parsed.data.day,
      stage: parsed.data.stage,
    },
    include: { band: { select: { slug: true } } },
  });
  return NextResponse.json({
    booking: { ...booking, bandSlug: booking.band.slug },
  });
}

export async function DELETE(req: Request) {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const url = new URL(req.url);
  const festivalId = url.searchParams.get("festivalId");
  const bandId = url.searchParams.get("bandId");
  if (!festivalId || !bandId) {
    return NextResponse.json({ error: "Missing ids" }, { status: 400 });
  }
  await db.festivalBooking
    .delete({ where: { festivalId_bandId: { festivalId, bandId } } })
    .catch(() => null);
  return NextResponse.json({ ok: true });
}
