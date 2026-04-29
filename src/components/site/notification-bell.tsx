import Link from "next/link";
import { Bell } from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/lib/db";

/**
 * Server-rendered bell with an unread count badge. Live updates would require
 * Server-Sent Events or polling; for now the count refreshes on full
 * navigation, which fits the editorial rhythm of the platform.
 */
export async function NotificationBell() {
  const session = await auth();
  if (!session?.user) return null;

  const unread = await db.notification
    .count({ where: { userId: session.user.id, read: false } })
    .catch(() => 0);

  return (
    <Link
      href="/notifications"
      aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`}
      className="relative inline-flex items-center justify-center h-9 w-9 hover:bg-secondary rounded-sm transition-colors"
    >
      <Bell className="h-4 w-4" />
      {unread > 0 && (
        <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-mono leading-4 text-center">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}
