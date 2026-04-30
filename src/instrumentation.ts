/**
 * Next.js boot hook. Runs once per worker. Wire optional production
 * observability vendors here. We deliberately don't pull a Sentry SDK by
 * default — operators can add it via env + this file:
 *
 *   if (process.env.SENTRY_DSN) {
 *     const Sentry = await import("@sentry/nextjs");
 *     Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0.1 });
 *     setObservability({
 *       captureException: (err, ctx) => Sentry.captureException(err, { extra: ctx }),
 *       captureEvent: (name, ctx) => Sentry.captureMessage(name, { extra: ctx }),
 *     });
 *   }
 */

export async function register() {
  // Intentionally empty by default. Replace per-deployment.
}
