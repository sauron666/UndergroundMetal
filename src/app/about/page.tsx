import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Manifesto",
  description: "Why Underground Metal exists, and what it's not.",
};

export default function AboutPage() {
  return (
    <div className="container py-16 max-w-3xl prose prose-invert">
      <h1 className="font-display text-5xl">Manifesto</h1>

      <p className="text-lg text-muted-foreground">
        Most platforms surface the loudest signal. We surface the truest.
      </p>

      <h2>What we are</h2>
      <p>
        Underground Metal is an AI-orchestrated platform for fans of rock and
        metal — with a deliberate bias toward the underground end of the
        spectrum. We do four things:
      </p>
      <ul>
        <li>
          <strong>Discover.</strong> An AI orchestrator translates
          free-form queries (style, mood, region, era) into two tiers of band
          recommendations: mainstream and deep underground. Every suggestion
          carries a verifiable source URL.
        </li>
        <li>
          <strong>Encyclopedia.</strong> A cross-referenced database of bands,
          line-ups, releases, and sub-genres. With a dedicated archive for
          Bulgarian acts that have been historically poorly catalogued.
        </li>
        <li>
          <strong>Concerts.</strong> Upcoming shows by city or country, with
          direct links to ticketing partners (Ticketpro, Eventim, DICE, See
          Tickets). We don&apos;t resell — we connect.
        </li>
        <li>
          <strong>Editorial.</strong> Reviews, interviews, news, and longreads.
          Anyone can pitch. Every claim of fact requires a citation. AI does
          a first moderation pass; an editor signs off.
        </li>
      </ul>

      <h2>What we are not</h2>
      <ul>
        <li>A label, an aggregator of pirated content, or a reseller.</li>
        <li>An algorithmic feed designed to maximise time-on-site.</li>
        <li>A platform for hate. NSBM is covered critically; not promoted.</li>
      </ul>

      <h2>How we make money</h2>
      <p>
        Three streams: Premium subscriptions (€5.99/mo, ad-free, deep underground
        filter, concert alerts), affiliate links to ticket vendors (we get
        paid only when someone actually buys), and modest tasteful ad
        placements that never appear for premium users. Authors keep 60% of
        premium reads attributed to their pieces.
      </p>

      <h2>Who runs this</h2>
      <p>
        Built by metalheads, in the open. If you want to contribute — code,
        articles, band data, photographs — get in touch.
      </p>

      <div className="mt-12 not-prose flex gap-2">
        <Button asChild variant="spike">
          <Link href="/auth/signup">Join</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/contribute">Contribute</Link>
        </Button>
      </div>
    </div>
  );
}
