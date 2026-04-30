/**
 * Vendor-neutral observability hook.
 *
 * Components call captureException()/captureEvent() at error boundaries; the
 * default implementation logs structured JSON via our logger. Integrators
 * wire a real provider (Sentry, Bugsnag, Honeycomb) by overriding the
 * exported functions:
 *
 *   import { setObservability } from "@/lib/observability";
 *   import * as Sentry from "@sentry/nextjs";
 *   setObservability({
 *     captureException: (err, ctx) => Sentry.captureException(err, { extra: ctx }),
 *     captureEvent: (name, ctx) => Sentry.captureMessage(name, { extra: ctx }),
 *   });
 *
 * Place the override in `src/instrumentation.ts` so Next.js loads it once
 * per worker boot.
 */

import { log } from "./logger";

export interface Observability {
  captureException(err: unknown, context?: Record<string, unknown>): void;
  captureEvent(name: string, context?: Record<string, unknown>): void;
}

let impl: Observability = {
  captureException(err, ctx) {
    const e = err instanceof Error ? err : new Error(String(err));
    log.error(e.message, {
      stack: e.stack,
      name: e.name,
      ...(ctx ?? {}),
    });
  },
  captureEvent(name, ctx) {
    log.warn(`event:${name}`, ctx);
  },
};

export function setObservability(next: Partial<Observability>) {
  impl = { ...impl, ...next };
}

export function captureException(
  err: unknown,
  context?: Record<string, unknown>
) {
  impl.captureException(err, context);
}

export function captureEvent(
  name: string,
  context?: Record<string, unknown>
) {
  impl.captureEvent(name, context);
}
