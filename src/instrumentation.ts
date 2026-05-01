/**
 * Next.js boot hook. Runs once per worker. Wire optional production
 * observability vendors here. We deliberately don't pull a Sentry SDK by
 * default — the wireSentry() helper dynamic-imports @sentry/nextjs only
 * when SENTRY_DSN is configured AND the package is actually installed.
 */

export async function register() {
  if (process.env.SENTRY_DSN) {
    const { wireSentry } = await import("./lib/observability-sentry");
    await wireSentry();
  }
}
