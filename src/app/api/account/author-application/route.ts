import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const Body = z.object({
  pitch: z.string().min(200).max(2000),
  samples: z.array(z.string().url()).max(6).default([]),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "READER") {
    return NextResponse.json(
      { error: "Already an author" },
      { status: 409 }
    );
  }

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten() },
      { status: 422 }
    );
  }

  // Re-apply collapses prior REJECTED applications into PENDING again.
  const app = await db.authorApplication.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      pitch: parsed.data.pitch,
      samples: parsed.data.samples,
    },
    update: {
      status: "PENDING",
      pitch: parsed.data.pitch,
      samples: parsed.data.samples,
      decisionNote: null,
      decidedAt: null,
      decidedById: null,
    },
  });

  return NextResponse.json({ application: app }, { status: 201 });
}
