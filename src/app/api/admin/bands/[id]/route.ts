import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { enqueue } from "@/server/jobs/queue";

export const runtime = "nodejs";

const Body = z.object({
  name: z.string().min(1).max(200),
  countryCode: z.string().length(2).nullable(),
  city: z.string().nullable().optional(),
  formedYear: z.number().int().nullable(),
  endedYear: z.number().int().nullable(),
  status: z.enum(["ACTIVE", "ON_HOLD", "SPLIT_UP", "CHANGED_NAME", "UNKNOWN"]),
  undergroundScore: z.number().int().min(1).max(10),
  heaviness: z.number().int().min(1).max(10),
  bio: z.string().nullable(),
  themes: z.array(z.string()).default([]),
  verified: z.boolean(),
  genreIds: z.array(z.string()).default([]),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!["EDITOR", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const { genreIds, ...rest } = parsed.data;

  const band = await db.band.update({
    where: { id },
    data: {
      ...rest,
      genres: {
        deleteMany: {},
        create: genreIds.map((genreId) => ({ genreId })),
      },
    },
  });

  // Re-embed since signature changed
  await enqueue("EMBED_BAND", { bandId: band.id }).catch(() => null);

  return NextResponse.json({ band });
}
