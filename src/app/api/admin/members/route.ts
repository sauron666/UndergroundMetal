import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";

export const runtime = "nodejs";

const Body = z.object({
  bandId: z.string(),
  // Either reference an existing person or create one by name
  personId: z.string().optional(),
  personName: z.string().min(1).max(120).optional(),
  role: z.enum(["VOCALS", "GUITAR", "BASS", "DRUMS", "KEYBOARDS", "OTHER"]),
  current: z.boolean().default(true),
  fromYear: z.number().int().min(1900).max(2100).nullable().optional(),
  toYear: z.number().int().min(1900).max(2100).nullable().optional(),
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

  let personId = parsed.data.personId;
  if (!personId) {
    if (!parsed.data.personName) {
      return NextResponse.json(
        { error: "personId or personName required" },
        { status: 422 }
      );
    }
    const baseSlug = slugify(parsed.data.personName).slice(0, 80) || "person";
    let slug = baseSlug;
    let attempt = 1;
    while (await db.person.findUnique({ where: { slug } })) {
      attempt += 1;
      slug = `${baseSlug}-${attempt}`;
      if (attempt > 100) break;
    }
    const person = await db.person.create({
      data: { slug, name: parsed.data.personName },
    });
    personId = person.id;
  }

  const member = await db.bandMember.create({
    data: {
      bandId: parsed.data.bandId,
      personId,
      role: parsed.data.role,
      current: parsed.data.current,
      fromYear: parsed.data.fromYear ?? null,
      toYear: parsed.data.toYear ?? null,
    },
    include: { person: true },
  });

  return NextResponse.json({ member });
}
