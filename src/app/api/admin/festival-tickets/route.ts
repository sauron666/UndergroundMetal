import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const Body = z.object({
  festivalId: z.string(),
  provider: z.enum([
    "TICKETPRO",
    "EVENTIM",
    "SEETICKETS",
    "TICKETMASTER",
    "DICE",
    "BANDCAMP",
    "DIRECT",
    "OTHER",
  ]),
  url: z.string().url(),
  passType: z.string().max(120).nullable().optional(),
  priceMinor: z.number().int().min(0).nullable().optional(),
  currency: z.string().length(3).nullable().optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !["EDITOR", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten() },
      { status: 422 }
    );
  }
  const ticket = await db.festivalTicket.create({
    data: parsed.data,
  });
  return NextResponse.json({ ticket });
}
