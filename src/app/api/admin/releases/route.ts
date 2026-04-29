import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const Body = z.object({
  bandId: z.string(),
  title: z.string().min(1).max(200),
  type: z.enum([
    "FULL_LENGTH",
    "EP",
    "DEMO",
    "SPLIT",
    "COMPILATION",
    "LIVE",
    "SINGLE",
  ]),
  year: z.number().int().min(1900).max(2100).nullable().optional(),
  releaseDate: z.string().datetime().nullable().optional(),
  coverUrl: z.string().url().nullable().optional(),
  bandcampUrl: z.string().url().nullable().optional(),
  spotifyId: z.string().nullable().optional(),
  description: z.string().max(5000).nullable().optional(),
  trackCount: z.number().int().min(0).max(500).nullable().optional(),
  durationSec: z.number().int().min(0).nullable().optional(),
});

async function requireStaff() {
  const session = await auth();
  if (!session?.user) return null;
  if (!["EDITOR", "ADMIN"].includes(session.user.role)) return null;
  return session;
}

export async function POST(req: Request) {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten() },
      { status: 422 }
    );
  }
  const release = await db.release.create({
    data: {
      ...parsed.data,
      releaseDate: parsed.data.releaseDate
        ? new Date(parsed.data.releaseDate)
        : null,
    },
  });
  return NextResponse.json({ release });
}
