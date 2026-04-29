"use client";

import { useEffect, useRef } from "react";

/**
 * Fires a single fire-and-forget POST to /api/articles/<id>/read on mount.
 * The server-side endpoint deduplicates by (article, day, fingerprint) so
 * refreshes / multi-tab won't inflate counts.
 */
export function ReadTracker({ articleId }: { articleId: string }) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    // Small delay so we don't track instant bounces
    const t = setTimeout(() => {
      fetch(`/api/articles/${articleId}/read`, {
        method: "POST",
        keepalive: true,
      }).catch(() => null);
    }, 4000);
    return () => clearTimeout(t);
  }, [articleId]);
  return null;
}
