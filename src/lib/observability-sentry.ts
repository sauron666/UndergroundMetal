/**
 * Optional Sentry adapter. Drop-in helper that operators can call from
 * `src/instrumentation.ts` to wire @sentry/nextjs into our vendor-neutral
 * captureException/captureEvent hook.
 *
 * Why optional: not every deploy uses Sentry. We don't want to pull the
 * SDK into the bundle when SENTRY_DSN is unset.
 *
 * Usage in instrumentation.ts:
 *
 *   export async function register() {
 *     if (process.env.SENTRY_DSN) {
 *       const { wireSentry } = await import("@/lib/observability-sentry");
 *       await wireSentry();
 *     }
 *   }
 *
 * Then add @sentry/nextjs to dependencies and configure SENTRY_DSN +
 * SENTRY_ENVIRONMENT in your platform's secret store.
 */

import { setObservability } from "./observability";

export async function wireSentry() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return false;

  // Dynamic import so the SDK only loads when actually configured.
  type SentryShape = {
    init: (opts: { dsn: string; tracesSampleRate?: number; environment?: string }) => void;
    captureException: (err: unknown, ctx?: { extra?: Record<string, unknown> }) => void;
    captureMessage: (msg: string, ctx?: { extra?: Record<string, unknown> }) => void;
  };
  let sentry: SentryShape;
  try {
    // Indirect specifier prevents TS/webpack from resolving the optional dep at build time.
    const moduleId = "@sentry/nextjs";
    sentry = (await import(/* webpackIgnore: true */ moduleId)) as unknown as SentryShape;
  } catch {
    console.warn(
      "[observability] SENTRY_DSN set but @sentry/nextjs not installed; skipping."
    );
    return false;
  }

  sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
  });

  setObservability({
    captureException: (err, ctx) =>
      sentry.captureException(err, ctx ? { extra: ctx } : undefined),
    captureEvent: (name, ctx) =>
      sentry.captureMessage(name, ctx ? { extra: ctx } : undefined),
  });
  return true;
}
