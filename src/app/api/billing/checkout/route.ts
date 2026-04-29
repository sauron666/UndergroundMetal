import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { env } from "@/lib/env";
import { getStripe } from "@/server/stripe";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(new URL("/auth/signin?next=/premium", req.url));
  }

  const plan = req.nextUrl.searchParams.get("plan") ?? "monthly";
  const priceId =
    plan === "yearly"
      ? env.STRIPE_PRICE_PREMIUM_YEARLY
      : env.STRIPE_PRICE_PREMIUM_MONTHLY;

  if (!env.STRIPE_SECRET_KEY || !priceId) {
    return NextResponse.json(
      { error: "Stripe is not configured. Set STRIPE_SECRET_KEY and price IDs." },
      { status: 503 }
    );
  }

  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const stripe = await getStripe();

  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId: user.id },
    });
    customerId = customer.id;
    await db.user.update({
      where: { id: user.id },
      data: { stripeCustomerId: customerId },
    });
  }

  const checkout = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${env.NEXT_PUBLIC_APP_URL}/premium/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.NEXT_PUBLIC_APP_URL}/premium`,
    allow_promotion_codes: true,
  });

  if (!checkout.url) {
    return NextResponse.json({ error: "Stripe error" }, { status: 500 });
  }
  return NextResponse.redirect(checkout.url, { status: 303 });
}
