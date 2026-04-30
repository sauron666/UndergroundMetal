/**
 * Weekly newsletter HTML for anonymous NewsletterSubscriber recipients.
 *
 * Composed from: top 5 articles published in the last 7 days + top 5 upcoming
 * shows in the next 30 days. Same brand-styled inline-HTML envelope as the
 * other transactional emails.
 */

import { env } from "@/lib/env";

const palette = {
  bg: "#0a0a0a",
  fg: "#e8e4d8",
  primary: "#8b0000",
  muted: "#7a7a7a",
  border: "#1f1f1f",
};

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export interface NewsletterArticle {
  title: string;
  slug: string;
  excerpt: string | null;
  type: string;
}

export interface NewsletterShow {
  title: string;
  slug: string;
  date: Date;
  city: string;
  countryCode: string;
}

export function newsletterIssue(opts: {
  unsubscribeToken: string;
  articles: NewsletterArticle[];
  shows: NewsletterShow[];
}) {
  const unsub = `${env.NEXT_PUBLIC_APP_URL}/api/newsletter/unsubscribe?t=${encodeURIComponent(opts.unsubscribeToken)}`;

  const articleHtml = opts.articles.length
    ? opts.articles
        .map(
          (a) => `
        <li style="padding:10px 0;border-bottom:1px solid ${palette.border};">
          <a href="${env.NEXT_PUBLIC_APP_URL}/articles/${a.slug}"
             style="color:${palette.fg};font-size:15px;text-decoration:none;font-weight:600;">
            ${escape(a.title)}
          </a>
          <br>
          <span style="color:${palette.muted};font-size:12px;text-transform:uppercase;letter-spacing:0.15em;">
            ${escape(a.type.toLowerCase())}
          </span>
          ${a.excerpt ? `<br><span style="color:${palette.muted};font-size:12px;">${escape(a.excerpt)}</span>` : ""}
        </li>`
        )
        .join("")
    : `<li style="color:${palette.muted};font-style:italic;">No new articles this week.</li>`;

  const showHtml = opts.shows.length
    ? opts.shows
        .map(
          (s) => `
        <li style="padding:10px 0;border-bottom:1px solid ${palette.border};">
          <a href="${env.NEXT_PUBLIC_APP_URL}/concerts/${s.slug}"
             style="color:${palette.fg};font-size:15px;text-decoration:none;font-weight:600;">
            ${escape(s.title)}
          </a>
          <br>
          <span style="color:${palette.muted};font-size:12px;">
            ${s.date.toLocaleDateString()} · ${escape(s.city)} [${escape(s.countryCode)}]
          </span>
        </li>`
        )
        .join("")
    : `<li style="color:${palette.muted};font-style:italic;">No upcoming shows.</li>`;

  const html = `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:${palette.bg};color:${palette.fg};font-family:Georgia,serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${palette.bg};">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td style="padding:32px 24px 16px;">
          <span style="color:${palette.primary};font-size:32px;font-weight:bold;">U.M.</span>
          <span style="color:${palette.muted};font-size:11px;letter-spacing:0.3em;text-transform:uppercase;margin-left:12px;">
            Underground Metal · Weekly
          </span>
        </td></tr>
        <tr><td style="padding:0 24px 24px;">
          <h2 style="font-size:14px;text-transform:uppercase;letter-spacing:0.25em;color:${palette.primary};margin:24px 0 8px;">
            New articles
          </h2>
          <ul style="list-style:none;padding:0;margin:0;">${articleHtml}</ul>

          <h2 style="font-size:14px;text-transform:uppercase;letter-spacing:0.25em;color:${palette.primary};margin:24px 0 8px;">
            Upcoming shows
          </h2>
          <ul style="list-style:none;padding:0;margin:0;">${showHtml}</ul>
        </td></tr>
        <tr><td style="padding:24px;color:${palette.muted};font-size:11px;line-height:1.6;">
          You signed up for the Underground Metal weekly newsletter.<br>
          <a href="${escape(unsub)}" style="color:${palette.muted};">Unsubscribe</a> ·
          <a href="${env.NEXT_PUBLIC_APP_URL}" style="color:${palette.muted};">Site</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  return {
    subject: "Underground Metal · weekly recap",
    html,
  };
}
