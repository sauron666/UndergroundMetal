/**
 * When a Show is added (manually or via scraper), notify followers of every
 * band on the bill. We dedupe per user so a 5-band bill fires at most one push
 * per follower.
 */

import { db } from "@/lib/db";
import { enqueue } from "@/server/jobs/queue";
import { env } from "@/lib/env";

export async function announceShow(showId: string) {
  if (!env.VAPID_PUBLIC_KEY) return { skipped: "vapid not configured" };

  const show = await db.show.findUnique({
    where: { id: showId },
    include: {
      venue: true,
      bands: { include: { band: true } },
    },
  });
  if (!show) return { error: "show not found" };

  const bandIds = show.bands.map((b) => b.bandId);
  if (bandIds.length === 0) return { delivered: 0 };

  const followers = await db.follow.findMany({
    where: { bandId: { in: bandIds } },
    select: { userId: true, bandId: true },
  });
  if (followers.length === 0) return { delivered: 0 };

  // Dedupe per user
  const seen = new Set<string>();
  const headliner =
    show.bands.find((b) => b.position === 0)?.band.name ??
    show.bands[0]?.band.name ??
    "Multiple bands";

  let queued = 0;
  for (const f of followers) {
    if (seen.has(f.userId)) continue;
    seen.add(f.userId);
    await enqueue("SEND_PUSH", {
      userId: f.userId,
      title: `${headliner} live in ${show.venue.city}`,
      body: `${new Date(show.date).toLocaleDateString()} · ${show.venue.name}`,
      url: `${env.NEXT_PUBLIC_APP_URL}/concerts/${show.slug}`,
      tag: `show-${show.id}`,
    });
    queued += 1;
  }
  return { queued };
}
