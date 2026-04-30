import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";

export const runtime = "nodejs";

const Body = z.object({
  name: z.string().min(1).max(200),
  city: z.string().min(1).max(120),
  region: z.string().nullable().optional(),
  countryCode: z.string().length(2),
  address: z.string().nullable().optional(),
  capacity: z.number().int().min(0).nullable().optional(),
  websiteUrl: z.string().url().nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
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

  const baseSlug =
    slugify(`${parsed.data.name}-${parsed.data.city}`).slice(0, 80) || "venue";
  let slug = baseSlug;
  let n = 1;
  while (await db.venue.findUnique({ where: { slug } })) {
    n += 1;
    slug = `${baseSlug}-${n}`;
    if (n > 100) break;
  }

  const venue = await db.venue.create({
    data: { ...parsed.data, slug },
    select: { id: true, slug: true },
  });
  return NextResponse.json({ venue });
}
