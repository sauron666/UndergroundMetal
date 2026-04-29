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

export function newsletterConfirmEmail(opts: { confirmToken: string }) {
  const url = `${env.NEXT_PUBLIC_APP_URL}/api/newsletter/confirm?t=${encodeURIComponent(opts.confirmToken)}`;
  const html = `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:${palette.bg};color:${palette.fg};font-family:Georgia,serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${palette.bg};">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td style="padding:32px 24px 16px;">
          <span style="color:${palette.primary};font-size:32px;font-weight:bold;">U.M.</span>
          <span style="color:${palette.muted};font-size:11px;letter-spacing:0.3em;text-transform:uppercase;margin-left:12px;">Underground Metal</span>
        </td></tr>
        <tr><td style="padding:0 24px 24px;">
          <h1 style="font-size:24px;line-height:1.2;margin:24px 0 12px;">Confirm your subscription</h1>
          <p style="font-size:14px;color:${palette.fg};line-height:1.6;">Click below to confirm. We'll send a weekly recap of new articles and shows. No spam, no third-party sharing.</p>
          <p style="margin:24px 0 12px;"><a href="${escape(url)}" style="display:inline-block;background:${palette.primary};color:${palette.fg};text-decoration:none;padding:10px 20px;font-size:12px;text-transform:uppercase;letter-spacing:0.2em;border-radius:2px;">Confirm subscription</a></p>
          <p style="font-size:12px;color:${palette.muted};">If you didn't sign up, ignore this email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
  return {
    subject: "Confirm your Underground Metal subscription",
    html,
    text: `Confirm: ${url}`,
  };
}
