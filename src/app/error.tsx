"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
    fetch("/api/log/error", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack,
        digest: error.digest,
        url:
          typeof window !== "undefined" ? window.location.href : undefined,
        userAgent:
          typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      }),
      keepalive: true,
    }).catch(() => null);
  }, [error]);

  return (
    <div className="container py-32 text-center max-w-md">
      <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-6" />
      <h1 className="font-display text-3xl mb-3">Something has corrupted.</h1>
      <p className="text-muted-foreground mb-8 text-sm">
        An error occurred while rendering this page. The incident has been
        noted in the eternal log.
      </p>
      {error.digest && (
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-6">
          digest: {error.digest}
        </p>
      )}
      <Button onClick={reset} variant="spike">
        Try again
      </Button>
    </div>
  );
}
