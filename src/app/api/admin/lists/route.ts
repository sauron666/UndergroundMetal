import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";

export const runtime = "nodejs";

const Body = z.object({
  title: z.string().min(1).max(200),
  description: z.string().nullable().optional(),
  kind: z.enum(["BEST_OF", "PRIMER", "STAFF_PICK", "USER"]),
  year: z.number().int().min(1900).max(2200).nullable().optional(),
  published: z.boolean().default(false),
  coverUrl: z.string().url().nullable().optional(),
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

  const baseSlug = slugify(parsed.data.title).slice(0, 80) || "list";
  let slug = baseSlug;
  let n = 1;
  while (await db.bandList.findUnique({ where: { slug } })) {
    n += 1;
    slug = `${baseSlug}-${n}`;
    if (n > 100) break;
  }

  const list = await db.bandList.create({
    data: {
      slug,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      kind: parsed.data.kind,
      year: parsed.data.year ?? null,
      published: parsed.data.published,
      coverUrl: parsed.data.coverUrl ?? null,
      curatorId: session.user.id,
      publishedAt: parsed.data.published ? new Date() : null,
    },
    select: { id: true, slug: true },
  });
  return NextResponse.json({ list });
}
