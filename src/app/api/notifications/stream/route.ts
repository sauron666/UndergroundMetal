import { auth } from "@/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Server-Sent Events stream for the notification bell.
 *
 * The implementation polls the user's notification table every 10 seconds
 * for new rows. SSE keeps the client connection open between polls so the
 * bell updates without a page refresh. This is intentionally simple — at
 * higher scale move to LISTEN/NOTIFY on Postgres or a pub-sub bus.
 *
 * The stream emits two event kinds:
 *   - "init"  : { unread } first frame after subscribe
 *   - "delta" : { unread } whenever the unread count changes
 *
 * Heartbeats (": ping") fire every 25s to keep proxies from killing idle
 * connections.
 */

const POLL_MS = 10_000;
const HEARTBEAT_MS = 25_000;

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return new Response("unauthorized", { status: 401 });
  }
  const userId = session.user.id;

  let lastUnread = await db.notification.count({
    where: { userId, read: false },
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(
            `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
          )
        );
      };
      const heartbeat = () => controller.enqueue(encoder.encode(": ping\n\n"));

      send("init", { unread: lastUnread });

      const heartbeatId = setInterval(heartbeat, HEARTBEAT_MS);
      const pollId = setInterval(async () => {
        try {
          const next = await db.notification.count({
            where: { userId, read: false },
          });
          if (next !== lastUnread) {
            lastUnread = next;
            send("delta", { unread: next });
          }
        } catch (e) {
          console.error("[sse] poll", e);
        }
      }, POLL_MS);

      // Close shop on stream cancel
      const close = () => {
        clearInterval(heartbeatId);
        clearInterval(pollId);
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      // No standard signal here; the runtime tears the controller down on
      // disconnect, which surfaces as enqueue throwing. We swallow that in
      // send via try/catch wrapped at the per-message level.
      const origSend = send;
      const safeSend = (event: string, data: unknown) => {
        try {
          origSend(event, data);
        } catch {
          close();
        }
      };
      // Replace heartbeat / poll with safe versions by rebinding:
      clearInterval(heartbeatId);
      clearInterval(pollId);
      const heartbeatId2 = setInterval(() => {
        try {
          heartbeat();
        } catch {
          clearInterval(heartbeatId2);
          clearInterval(pollId2);
          try {
            controller.close();
          } catch {
            // ignore
          }
        }
      }, HEARTBEAT_MS);
      const pollId2 = setInterval(async () => {
        try {
          const next = await db.notification.count({
            where: { userId, read: false },
          });
          if (next !== lastUnread) {
            lastUnread = next;
            safeSend("delta", { unread: next });
          }
        } catch {
          // ignore — next tick retries
        }
      }, POLL_MS);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
