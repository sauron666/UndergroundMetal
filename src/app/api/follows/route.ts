import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { findSimilarBands } from "@/server/similar";
import { consumeToken, userKey } from "@/server/security/rate-limit";

export const runtime = "nodejs";

const Body = z.object({
  bandId: z.string(),
  follow: z.boolean(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 120 follow toggles / user / 10 min — generous, but caps automated mass-
  // follow scripts.
  if (
    !(await consumeToken({
      key: userKey(session.user.id, "follow"),
      capacity: 120,
      refillPerSec: 120 / 600,
    }))
  ) {
    return NextResponse.json(
      { error: "Slow down" },
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

  const { bandId, follow } = parsed.data;
  if (follow) {
    await db.follow
      .upsert({
        where: { userId_bandId: { userId: session.user.id, bandId } },
        create: { userId: session.user.id, bandId },
        update: {},
      })
      .catch(() => null);
  } else {
    await db.follow
      .delete({ where: { userId_bandId: { userId: session.user.id, bandId } } })
      .catch(() => null);
  }

  const count = await db.follow.count({ where: { bandId } });

  // On follow, surface a small "you might also dig" set + any upcoming show
  // for the band you just followed.
  let suggestions: { slug: string; name: string }[] = [];
  let upcomingShow:
    | { slug: string; title: string; city: string; date: string }
    | null = null;

  if (follow) {
    const [similars, existing] = await Promise.all([
      findSimilarBands(bandId, 6).catch(() => []),
      db.follow.findMany({
        where: { userId: session.user.id },
        select: { bandId: true },
      }),
    ]);
    const followedIds = new Set(existing.map((f) => f.bandId));
    suggestions = similars
      .filter((s) => !followedIds.has(s.id))
      .slice(0, 3)
      .map((s) => ({ slug: s.slug, name: s.name }));

    const show = await db.show
      .findFirst({
        where: {
          date: { gte: new Date() },
          bands: { some: { bandId } },
        },
        include: { venue: true },
        orderBy: { date: "asc" },
      })
      .catch(() => null);
    if (show) {
      upcomingShow = {
        slug: show.slug,
        title: show.title,
        city: show.venue.city,
        date: show.date.toISOString(),
      };
    }
  }

  return NextResponse.json({
    ok: true,
    following: follow,
    count,
    suggestions,
    upcomingShow,
  });
}
