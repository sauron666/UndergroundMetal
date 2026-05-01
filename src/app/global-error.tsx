"use client";

import { useEffect } from "react";

/**
 * Last-resort error boundary. Renders when the root layout itself throws,
 * so we can't rely on any of our shared chrome here — must include
 * <html> and <body>. Keep the markup minimal and dependency-free.
 *
 * For errors below the root layout, src/app/error.tsx is the boundary.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    fetch("/api/log/error", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack,
        digest: error.digest,
        scope: "global",
        url:
          typeof window !== "undefined" ? window.location.href : undefined,
      }),
      keepalive: true,
    }).catch(() => null);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          background: "#0c0a09",
          color: "#fafaf9",
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 480 }}>
          <h1 style={{ fontSize: "1.75rem", margin: "0 0 1rem" }}>
            The hall has collapsed.
          </h1>
          <p style={{ color: "#a8a29e", marginBottom: "2rem" }}>
            A fatal error prevented the page from rendering. The incident has
            been logged.
          </p>
          {error.digest && (
            <p
              style={{
                fontSize: "0.7rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#78716c",
                marginBottom: "1.5rem",
              }}
            >
              digest: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              padding: "0.6rem 1.25rem",
              border: "1px solid #57534e",
              background: "transparent",
              color: "#fafaf9",
              cursor: "pointer",
              fontSize: "0.875rem",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
