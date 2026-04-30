/**
 * Send the weekly newsletter to a single anonymous subscriber.
 * Payload: { subscriberId: string }
 */

import { z } from "zod";
import { db } from "@/lib/db";
import { sendEmail, isEmailConfigured } from "@/server/email/client";
import { newsletterIssue } from "@/server/email/newsletter-issue";

const Payload = z.object({ subscriberId: z.string() });

export async function sendNewsletter(payload: unknown) {
  if (!isEmailConfigured()) return { skipped: "email not configured" };

  const { subscriberId } = Payload.parse(payload);
  const sub = await db.newsletterSubscriber.findUnique({
    where: { id: subscriberId },
  });
  if (!sub || sub.status !== "CONFIRMED") {
    return { skipped: `status ${sub?.status ?? "missing"}` };
  }

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const inThirty = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const [articles, shows] = await Promise.all([
    db.article.findMany({
      where: { status: "PUBLISHED", publishedAt: { gte: since } },
      orderBy: { publishedAt: "desc" },
      take: 5,
      select: { title: true, slug: true, excerpt: true, type: true },
    }),
    db.show.findMany({
      where: {
        date: { gte: new Date(), lt: inThirty },
        status: { not: "PAST" },
      },
      include: { venue: true },
      orderBy: { date: "asc" },
      take: 5,
    }),
  ]);

  if (articles.length === 0 && shows.length === 0) {
    return { skipped: "empty" };
  }

  const tmpl = newsletterIssue({
    unsubscribeToken: sub.unsubscribeToken,
    articles,
    shows: shows.map((s) => ({
      title: s.title,
      slug: s.slug,
      date: s.date,
      city: s.venue.city,
      countryCode: s.venue.countryCode,
    })),
  });

  await sendEmail({
    to: sub.email,
    subject: tmpl.subject,
    html: tmpl.html,
  });

  await db.emailLog.create({
    data: {
      to: sub.email,
      template: "newsletter-weekly",
      subject: tmpl.subject,
      meta: {
        articleCount: articles.length,
        showCount: shows.length,
        subscriberId,
      },
    },
  });

  return { delivered: 1 };
}
