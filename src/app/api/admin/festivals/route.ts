import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";

export const runtime = "nodejs";

const Body = z.object({
  name: z.string().min(1).max(200),
  startDate: z.string(),
  endDate: z.string(),
  city: z.string().min(1).max(120),
  countryCode: z.string().length(2),
  venueName: z.string().nullable().optional(),
  websiteUrl: z.string().url().nullable().optional(),
  posterUrl: z.string().url().nullable().optional(),
  description: z.string().nullable().optional(),
  status: z.enum(["ANNOUNCED", "CONFIRMED", "CANCELLED", "POSTPONED", "PAST"]),
  undergroundScore: z.number().int().min(1).max(10).default(5),
  verified: z.boolean().default(false),
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

  const baseSlug = slugify(parsed.data.name).slice(0, 80) || "festival";
  let slug = baseSlug;
  let n = 1;
  while (await db.festival.findUnique({ where: { slug } })) {
    n += 1;
    slug = `${baseSlug}-${n}`;
    if (n > 100) break;
  }

  const festival = await db.festival.create({
    data: {
      slug,
      name: parsed.data.name,
      startDate: new Date(parsed.data.startDate),
      endDate: new Date(parsed.data.endDate),
      city: parsed.data.city,
      countryCode: parsed.data.countryCode,
      venueName: parsed.data.venueName ?? null,
      websiteUrl: parsed.data.websiteUrl ?? null,
      posterUrl: parsed.data.posterUrl ?? null,
      description: parsed.data.description ?? null,
      status: parsed.data.status,
      undergroundScore: parsed.data.undergroundScore,
      verified: parsed.data.verified,
    },
    select: { id: true, slug: true },
  });
  return NextResponse.json({ festival });
}
