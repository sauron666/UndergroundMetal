import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";

export const runtime = "nodejs";

const Body = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).nullable().optional(),
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

  const baseSlug = slugify(parsed.data.title).slice(0, 80) || "series";
  let slug = baseSlug;
  let n = 1;
  while (await db.articleSeries.findUnique({ where: { slug } })) {
    n += 1;
    slug = `${baseSlug}-${n}`;
    if (n > 100) break;
  }

  const series = await db.articleSeries.create({
    data: {
      slug,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      coverUrl: parsed.data.coverUrl ?? null,
    },
    select: { id: true, slug: true },
  });
  return NextResponse.json({ series });
}
