/**
 * Send the weekly digest email to a single user. Enqueued in bulk by a
 * separate cron-style script (`pnpm digest:send`) so failures retry per-user.
 *
 * Payload: { userId: string, since?: ISO date }
 */

import { z } from "zod";
import { db } from "@/lib/db";
import { sendEmail } from "@/server/email/client";
import { weeklyDigestEmail, type DigestItem } from "@/server/email/templates";
import { env } from "@/lib/env";

const Payload = z.object({
  userId: z.string(),
  since: z.string().datetime().optional(),
});

export async function sendDigest(payload: unknown) {
  const { userId, since } = Payload.parse(payload);

  const user = await db.user.findUnique({
    where: { id: userId },
    include: { emailPreference: true },
  });
  if (!user || !user.email) return { skipped: "no user" };
  if (user.emailPreference && !user.emailPreference.weeklyDigest) {
    return { skipped: "opt-out" };
  }

  const sinceDate = since ? new Date(since) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const follows = await db.follow.findMany({
    where: { userId },
    select: { bandId: true },
  });
  const bandIds = follows.map((f) => f.bandId);

  const articles = bandIds.length
    ? await db.article.findMany({
        where: {
          status: "PUBLISHED",
          publishedAt: { gte: sinceDate },
          bands: { some: { bandId: { in: bandIds } } },
        },
        orderBy: { publishedAt: "desc" },
        take: 10,
      })
    : [];

  const shows = bandIds.length
    ? await db.show.findMany({
        where: {
          createdAt: { gte: sinceDate },
          date: { gte: new Date() },
          bands: { some: { bandId: { in: bandIds } } },
        },
        include: { venue: true },
        orderBy: { date: "asc" },
        take: 10,
      })
    : [];

  if (articles.length === 0 && shows.length === 0) {
    return { skipped: "empty" };
  }

  const items: DigestItem[] = [
    ...articles.map((a) => ({
      kind: "article" as const,
      title: a.title,
      url: `${env.NEXT_PUBLIC_APP_URL}/articles/${a.slug}`,
      meta: a.type.toLowerCase().replace("_", " "),
    })),
    ...shows.map((s) => ({
      kind: "show" as const,
      title: s.title,
      url: `${env.NEXT_PUBLIC_APP_URL}/concerts/${s.slug}`,
      meta: `${new Date(s.date).toLocaleDateString()} · ${s.venue.city}`,
    })),
  ];

  const tmpl = weeklyDigestEmail({
    name: user.username ?? user.name ?? "fan",
    items,
  });

  await sendEmail({
    to: user.email,
    subject: tmpl.subject,
    html: tmpl.html,
  });

  await db.emailLog.create({
    data: {
      userId,
      to: user.email,
      template: "weekly-digest",
      subject: tmpl.subject,
      meta: { itemCount: items.length, since: sinceDate.toISOString() },
    },
  });

  return { delivered: 1, items: items.length };
}
