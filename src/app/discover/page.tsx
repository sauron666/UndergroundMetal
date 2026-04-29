import type { Metadata } from "next";
import { DiscoveryClient } from "./discovery-client";

export const metadata: Metadata = {
  title: "Discover bands",
  description:
    "AI-powered metal & rock band discovery. Tell us a style, mood, theme, region or era — get mainstream and underground recommendations with verifiable sources.",
};

interface PageProps {
  searchParams: Promise<{ q?: string; country?: string; under?: string }>;
}

export default async function DiscoverPage({ searchParams }: PageProps) {
  const params = await searchParams;
  return (
    <div className="container py-10 md:py-14">
      <header className="mb-8">
        <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-2">
          ⛧ AI Discovery
        </p>
        <h1 className="font-display text-4xl md:text-5xl tracking-tight">
          Summon the bands you don&apos;t know yet.
        </h1>
        <p className="mt-3 text-muted-foreground max-w-2xl">
          Describe a sound, mood, lyrical theme, region, or era. Our AI
          orchestrator returns two tiers — mainstream giants and deep
          underground — each with sourced references you can verify.
        </p>
      </header>

      <DiscoveryClient initialQuery={params.q ?? ""} />
    </div>
  );
}
