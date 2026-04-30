import { env } from "@/lib/env";

const palette = {
  bg: "#0a0a0a",
  fg: "#e8e4d8",
  primary: "#8b0000",
  muted: "#7a7a7a",
};

function escape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function magicLinkEmail(opts: { token: string }) {
  const url = `${env.NEXT_PUBLIC_APP_URL}/api/auth/magic/consume?t=${encodeURIComponent(opts.token)}`;
  const html = `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:${palette.bg};color:${palette.fg};font-family:Georgia,serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${palette.bg};">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td style="padding:32px 24px;">
          <span style="color:${palette.primary};font-size:32px;font-weight:bold;">U.M.</span>
          <span style="color:${palette.muted};font-size:11px;letter-spacing:0.3em;text-transform:uppercase;margin-left:12px;">Underground Metal</span>
          <h1 style="font-size:22px;line-height:1.2;margin:24px 0 12px;">Sign-in link</h1>
          <p style="font-size:14px;color:${palette.fg};line-height:1.6;">Click the link below to sign in. It expires in 15 minutes and can only be used once.</p>
          <p style="margin:24px 0 12px;"><a href="${escape(url)}" style="display:inline-block;background:${palette.primary};color:${palette.fg};text-decoration:none;padding:10px 20px;font-size:12px;text-transform:uppercase;letter-spacing:0.2em;border-radius:2px;">Sign in</a></p>
          <p style="font-size:11px;color:${palette.muted};">If you didn't request this, ignore the email — your account is safe.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
  return {
    subject: "Your sign-in link to Underground Metal",
    html,
    text: `Sign in: ${url}`,
  };
}
