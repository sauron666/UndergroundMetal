import type { Metadata } from "next";
import Link from "next/link";
import { Check, Flame } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PREMIUM_FEATURES } from "@/server/stripe";

export const metadata: Metadata = {
  title: "Premium",
  description:
    "Unlock the deep underground, drop the ads, and get concert alerts. Authors earn revenue share.",
};

export default function PremiumPage() {
  return (
    <div className="container py-16 max-w-4xl">
      <div className="text-center mb-12">
        <Badge variant="blood" className="mb-4">
          <Flame className="h-3 w-3 mr-1" /> Premium
        </Badge>
        <h1 className="font-display text-5xl md:text-6xl tracking-tight mb-4">
          Pay the toll. Get the keys.
        </h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Underground Metal stays free for everyone. Premium funds the servers,
          the editors, and a revenue share for authors. No labels. No
          billionaires. Just metalheads.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Monthly</CardTitle>
            <p className="text-3xl font-mono mt-2">
              €5.99
              <span className="text-sm text-muted-foreground"> / month</span>
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Features />
            <Button asChild variant="outline" className="w-full">
              <Link href="/api/billing/checkout?plan=monthly">Subscribe</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-primary/60 ring-blood">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl">Yearly</CardTitle>
              <Badge variant="blood">2 months free</Badge>
            </div>
            <p className="text-3xl font-mono mt-2">
              €59.99
              <span className="text-sm text-muted-foreground"> / year</span>
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Features />
            <Button asChild variant="spike" className="w-full">
              <Link href="/api/billing/checkout?plan=yearly">Subscribe</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground text-center mt-8">
        Cancel anytime. Powered by Stripe. Authors keep 60% of premium reads
        attributed to their pieces.
      </p>
    </div>
  );
}

function Features() {
  return (
    <ul className="space-y-2">
      {PREMIUM_FEATURES.map((f) => (
        <li key={f} className="flex items-start gap-2 text-sm">
          <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <span>{f}</span>
        </li>
      ))}
    </ul>
  );
}
