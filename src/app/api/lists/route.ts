import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";

export const runtime = "nodejs";

const Body = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(2000).optional(),
  items: z
    .array(
      z.object({
        bandId: z.string(),
        position: z.number().int().min(0).max(9999),
        note: z.string().max(2000).optional(),
      })
    )
    .min(1)
    .max(100),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten() },
      { status: 422 }
    );
  }

  // Reject items pointing at non-existent bands.
  const ids = Array.from(new Set(parsed.data.items.map((i) => i.bandId)));
  const found = await db.band.findMany({
    where: { id: { in: ids } },
    select: { id: true },
  });
  const valid = new Set(found.map((b) => b.id));
  const items = parsed.data.items.filter((i) => valid.has(i.bandId));
  if (items.length === 0) {
    return NextResponse.json(
      { error: "No valid bands in the list" },
      { status: 422 }
    );
  }

  const baseSlug =
    `${slugify(parsed.data.title).slice(0, 60)}-by-${session.user.username ?? session.user.id.slice(0, 6)}`;
  let slug = baseSlug;
  let n = 1;
  while (await db.bandList.findUnique({ where: { slug } })) {
    n += 1;
    slug = `${baseSlug}-${n}`;
    if (n > 100) break;
  }

  // User-curated lists publish immediately. Editor moderation is a future
  // feature gated by Report flagging.
  const list = await db.bandList.create({
    data: {
      slug,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      kind: "USER",
      curatorId: session.user.id,
      published: true,
      publishedAt: new Date(),
      items: {
        create: items.map((it) => ({
          bandId: it.bandId,
          position: it.position,
          note: it.note ?? null,
        })),
      },
    },
    select: { id: true, slug: true },
  });

  return NextResponse.json({ list });
}
