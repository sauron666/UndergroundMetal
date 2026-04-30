import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";
import { consumeToken, userKey } from "@/server/security/rate-limit";

export const runtime = "nodejs";

const Body = z.object({
  title: z.string().min(3).max(200),
  body: z.string().min(1).max(20_000),
  category: z.enum([
    "GENERAL",
    "RECOMMENDATIONS",
    "GEAR",
    "LOCAL_SCENES",
    "FESTIVALS",
    "RELEASES",
    "META",
  ]),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // 5 thread creations / user / hour to keep the front page sane.
  if (
    !(await consumeToken({
      key: userKey(session.user.id, "forum-thread"),
      capacity: 5,
      refillPerSec: 5 / 3600,
    }))
  ) {
    return NextResponse.json(
      { error: "Slow down on new threads" },
      { status: 429 }
    );
  }
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const baseSlug = slugify(parsed.data.title).slice(0, 80) || "thread";
  let slug = baseSlug;
  let attempt = 1;
  while (await db.forumThread.findUnique({ where: { slug } })) {
    attempt += 1;
    slug = `${baseSlug}-${attempt}`;
    if (attempt > 100) break;
  }

  const thread = await db.forumThread.create({
    data: {
      slug,
      title: parsed.data.title,
      body: parsed.data.body,
      category: parsed.data.category,
      authorId: session.user.id,
    },
    select: { id: true, slug: true },
  });

  return NextResponse.json({ thread }, { status: 201 });
}
