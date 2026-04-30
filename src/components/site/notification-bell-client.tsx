"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";

export function NotificationBellClient({
  initialUnread,
}: {
  initialUnread: number;
}) {
  const [unread, setUnread] = useState(initialUnread);

  useEffect(() => {
    if (typeof window === "undefined" || typeof EventSource === "undefined") {
      return;
    }
    const es = new EventSource("/api/notifications/stream");
    es.addEventListener("init", (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data);
        if (typeof data.unread === "number") setUnread(data.unread);
      } catch {
        // ignore malformed
      }
    });
    es.addEventListener("delta", (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data);
        if (typeof data.unread === "number") setUnread(data.unread);
      } catch {
        // ignore
      }
    });
    es.onerror = () => {
      // Browser auto-reconnects; nothing to do.
    };
    return () => es.close();
  }, []);

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
