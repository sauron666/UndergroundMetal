/**
 * Web Push delivery (RFC 8030 + VAPID auth).
 *
 * We use the `web-push` library, which handles VAPID JWT signing and AES-GCM
 * payload encryption. Configuration:
 *   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY (generated once with `npx web-push generate-vapid-keys`)
 *   VAPID_SUBJECT  e.g. "mailto:contact@undergroundmetal.app"
 */

import { env } from "@/lib/env";

let _wp: unknown = null;
async function getClient() {
  if (_wp) return _wp;
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
    throw new Error("VAPID keys not configured");
  }
  const mod = await import("web-push");
  const wp = (mod as unknown as { default?: typeof mod }).default ?? mod;
  (wp as { setVapidDetails: (subject: string, pub: string, priv: string) => void })
    .setVapidDetails(
      env.VAPID_SUBJECT ?? "mailto:contact@undergroundmetal.app",
      env.VAPID_PUBLIC_KEY,
      env.VAPID_PRIVATE_KEY
    );
  _wp = wp;
  return wp;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  icon?: string;
}

export async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload
) {
  const wp = (await getClient()) as {
    sendNotification: (
      sub: { endpoint: string; keys: { p256dh: string; auth: string } },
      payload: string,
      options?: { TTL?: number }
    ) => Promise<unknown>;
  };
  return wp.sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: { p256dh: subscription.p256dh, auth: subscription.auth },
    },
    JSON.stringify(payload),
    { TTL: 60 * 60 * 24 }
  );
}
