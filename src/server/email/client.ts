/**
 * Email delivery via Resend. We dynamically import the SDK so dev environments
 * without RESEND_API_KEY still build.
 *
 * Usage:
 *   await sendEmail({ to, subject, html, text });
 */

import { env } from "@/lib/env";

let _client: unknown = null;
async function getClient() {
  if (_client) return _client;
  if (!env.RESEND_API_KEY) throw new Error("RESEND_API_KEY is not set");
  const { Resend } = await import("resend");
  _client = new Resend(env.RESEND_API_KEY);
  return _client;
}

export interface EmailMessage {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  // Per-message override; defaults to EMAIL_FROM
  from?: string;
  replyTo?: string;
}

export async function sendEmail(msg: EmailMessage) {
  const client = (await getClient()) as {
    emails: {
      send: (opts: {
        from: string;
        to: string | string[];
        subject: string;
        html: string;
        text?: string;
        replyTo?: string;
      }) => Promise<unknown>;
    };
  };
  return client.emails.send({
    from: msg.from ?? env.EMAIL_FROM,
    to: msg.to,
    subject: msg.subject,
    html: msg.html,
    text: msg.text,
    replyTo: msg.replyTo ?? env.EMAIL_REPLY_TO,
  });
}

export function isEmailConfigured(): boolean {
  return !!env.RESEND_API_KEY;
}
