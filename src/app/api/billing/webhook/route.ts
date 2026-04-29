import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { env } from "@/lib/env";
import { getStripe } from "@/server/stripe";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }
  const stripe = await getStripe();
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Bad signature" },
      { status: 400 }
    );
  }

  switch (event.type) {
    case "checkout.session.completed":
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub =
        "subscription" in event.data.object
          ? await stripe.subscriptions.retrieve(
              event.data.object.subscription as string
            )
          : (event.data.object as Stripe.Subscription);

      const user = await db.user.findUnique({
        where: { stripeCustomerId: sub.customer as string },
      });
      if (!user) break;

      const isActive = ["active", "trialing"].includes(sub.status);

      await db.user.update({
        where: { id: user.id },
        data: { tier: isActive ? "PREMIUM" : "FREE" },
      });

      await db.subscription.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          stripeSubscriptionId: sub.id,
          status: sub.status,
          priceId: sub.items.data[0]?.price.id ?? "",
          currentPeriodEnd: new Date(sub.current_period_end * 1000),
          cancelAtPeriodEnd: sub.cancel_at_period_end,
        },
        update: {
          stripeSubscriptionId: sub.id,
          status: sub.status,
          priceId: sub.items.data[0]?.price.id ?? "",
          currentPeriodEnd: new Date(sub.current_period_end * 1000),
          cancelAtPeriodEnd: sub.cancel_at_period_end,
        },
      });
      break;
    }
    default:
      // ignore
      break;
  }

  return NextResponse.json({ received: true });
}
