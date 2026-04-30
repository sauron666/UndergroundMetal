import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NotificationBellClient } from "./notification-bell-client";

/**
 * Server-side wrapper. Renders an initial unread count synchronously, then
 * delegates to the client component which subscribes to /api/notifications/stream
 * for live deltas via SSE.
 */
export async function NotificationBell() {
  const session = await auth();
  if (!session?.user) return null;

  const initialUnread = await db.notification
    .count({ where: { userId: session.user.id, read: false } })
    .catch(() => 0);

  return <NotificationBellClient initialUnread={initialUnread} />;
}
