/**
 * Email HTML templates. Plain inline-styled HTML so they render in every
 * email client without external CSS. Minimal escaping helper for user-supplied
 * strings. We deliberately do not pull in MJML / react-email — the volume here
 * is small and a hand-rolled palette + typography matches the brand.
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
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function shell(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width">
<title>${escape(title)}</title>
</head>
<body style="margin:0;padding:0;background:${palette.bg};color:${palette.fg};font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${palette.bg};">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td style="padding:32px 24px 16px;">
          <a href="${env.NEXT_PUBLIC_APP_URL}" style="color:${palette.primary};text-decoration:none;font-size:32px;font-weight:bold;">U.M.</a>
          <span style="color:${palette.muted};font-size:11px;letter-spacing:0.3em;text-transform:uppercase;margin-left:12px;">Underground Metal</span>
        </td></tr>
        <tr><td style="padding:0 24px 24px;border-bottom:1px solid ${palette.border};">
          ${body}
        </td></tr>
        <tr><td style="padding:24px;color:${palette.muted};font-size:11px;line-height:1.6;">
          You're receiving this because you signed up at Underground Metal.<br>
          <a href="${env.NEXT_PUBLIC_APP_URL}/account/preferences" style="color:${palette.muted};">Email preferences</a> ·
          <a href="${env.NEXT_PUBLIC_APP_URL}" style="color:${palette.muted};">Site</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function btn(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:${palette.primary};color:${palette.fg};text-decoration:none;padding:10px 20px;font-size:12px;text-transform:uppercase;letter-spacing:0.2em;border-radius:2px;">${escape(label)}</a>`;
}

export function welcomeEmail(opts: { name: string }) {
  const body = `
    <h1 style="font-size:28px;line-height:1.2;margin:24px 0 12px;">Welcome to the crypt, ${escape(opts.name)}.</h1>
    <p style="font-size:15px;line-height:1.6;color:${palette.fg};">You now have a name carved at <strong>Underground Metal</strong>. Here's where to start:</p>
    <ul style="font-size:14px;line-height:1.8;padding-left:18px;">
      <li><a href="${env.NEXT_PUBLIC_APP_URL}/discover" style="color:${palette.primary};">Try AI Discovery</a> — describe a sound, get bands you've never heard.</li>
      <li><a href="${env.NEXT_PUBLIC_APP_URL}/bg-archive" style="color:${palette.primary};">Browse the BG Archive</a> if you want regional underground.</li>
      <li><a href="${env.NEXT_PUBLIC_APP_URL}/articles/new" style="color:${palette.primary};">Pitch a piece</a> — every claim cited, AI fact-check, editor sign-off.</li>
    </ul>
    <p style="margin:24px 0 12px;">${btn(env.NEXT_PUBLIC_APP_URL, "Enter the site")}</p>
  `;
  return {
    subject: "Welcome to Underground Metal",
    html: shell("Welcome", body),
    text: `Welcome to Underground Metal, ${opts.name}. Visit ${env.NEXT_PUBLIC_APP_URL} to start.`,
  };
}

export interface DigestItem {
  kind: "article" | "show";
  title: string;
  url: string;
  meta: string;
}

export function weeklyDigestEmail(opts: { name: string; items: DigestItem[] }) {
  const sections = {
    article: opts.items.filter((i) => i.kind === "article"),
    show: opts.items.filter((i) => i.kind === "show"),
  };
  const renderSection = (title: string, items: DigestItem[]) => {
    if (items.length === 0) return "";
    return `
      <h2 style="font-size:14px;text-transform:uppercase;letter-spacing:0.25em;color:${palette.primary};margin:24px 0 8px;">${escape(title)}</h2>
      <ul style="list-style:none;padding:0;margin:0;">
        ${items
          .map(
            (i) => `
          <li style="padding:10px 0;border-bottom:1px solid ${palette.border};">
            <a href="${i.url}" style="color:${palette.fg};font-size:15px;text-decoration:none;font-weight:600;">${escape(i.title)}</a><br>
            <span style="color:${palette.muted};font-size:12px;">${escape(i.meta)}</span>
          </li>`
          )
          .join("")}
      </ul>
    `;
  };

  const body = `
    <h1 style="font-size:24px;line-height:1.2;margin:24px 0 12px;">This week, ${escape(opts.name)}.</h1>
    <p style="font-size:14px;color:${palette.muted};">Articles and shows tied to bands you follow.</p>
    ${renderSection("New articles", sections.article)}
    ${renderSection("Upcoming shows", sections.show)}
    ${opts.items.length === 0 ? `<p style="color:${palette.muted};font-style:italic;margin-top:24px;">Nothing new this week — try <a href="${env.NEXT_PUBLIC_APP_URL}/discover" style="color:${palette.primary};">AI Discovery</a>.</p>` : ""}
  `;
  return {
    subject: `Underground Metal · weekly`,
    html: shell("Weekly digest", body),
  };
}

export function passwordResetEmail(opts: { name: string; token: string }) {
  const url = `${env.NEXT_PUBLIC_APP_URL}/auth/reset?token=${encodeURIComponent(opts.token)}`;
  const body = `
    <h1 style="font-size:24px;line-height:1.2;margin:24px 0 12px;">Reset your password</h1>
    <p style="font-size:14px;color:${palette.fg};line-height:1.6;">${escape(opts.name)}, click the button below to choose a new password. This link expires in 30 minutes.</p>
    <p style="margin:24px 0 12px;">${btn(url, "Reset password")}</p>
    <p style="font-size:12px;color:${palette.muted};">If you didn't request this, ignore the email.</p>
  `;
  return {
    subject: "Reset your Underground Metal password",
    html: shell("Reset password", body),
    text: `Reset link: ${url}`,
  };
}
