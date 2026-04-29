import { env } from "@/lib/env";

/**
 * Lazy Stripe client. We don't bundle the SDK if STRIPE_SECRET_KEY is missing,
 * so dev environments without Stripe still build cleanly.
 */
export async function getStripe() {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  // dynamic import keeps stripe out of the bundle when unused
  const Stripe = (await import("stripe")).default;
  // Pin to whatever API version the installed SDK targets by default
  return new Stripe(env.STRIPE_SECRET_KEY);
}

export const PREMIUM_FEATURES = [
  "Unlimited AI Discovery summons",
  "Deep underground filter (score 8+)",
  "Premium-only longreads & interviews",
  "Concert alerts for followed bands",
  "Author revenue share (if you publish)",
  "No ads, ever",
] as const;
