import Link from "next/link";
import { ArrowRight, Flame, Skull, Ticket, Newspaper, Search, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DiscoveryHero } from "@/components/site/discovery-hero";

const featurePillars = [
  {
    icon: Flame,
    title: "AI Discovery",
    description:
      "Tell us a style, mood, or theme. We surface mainstream giants and obscure underground bands you've never heard of.",
    href: "/discover",
  },
  {
    icon: Skull,
    title: "Encyclopedia",
    description:
      "Cross-referenced band data — formation, line-ups, releases, sub-genres. With a dedicated Bulgarian archive.",
    href: "/bands",
  },
  {
    icon: Ticket,
    title: "Concerts & Tickets",
    description:
      "Concerts in your city or country with direct links to Ticketpro, Eventim, DICE and box-office tickets.",
    href: "/concerts",
  },
  {
    icon: Newspaper,
    title: "Sourced Editorial",
    description:
      "Reviews, interviews, news — every claim backed by a citation. Anyone can write, but everything is checked.",
    href: "/articles",
  },
];

export default function HomePage() {
  return (
    <div className="relative">
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="absolute inset-0 bg-grain pointer-events-none" />
        <div className="absolute inset-0 bg-noise opacity-[0.04] pointer-events-none mix-blend-overlay" />
        <div className="container relative pt-20 pb-24 md:pt-28 md:pb-32">
          <Badge variant="blood" className="mb-6">
            <Flame className="h-3 w-3 mr-1" /> NEW · AI Underground Discovery
          </Badge>
          <h1 className="font-display font-extrabold text-5xl md:text-7xl lg:text-8xl leading-[0.95] tracking-tight max-w-5xl">
            Dig deeper than the{" "}
            <span className="text-primary text-shadow-blood">algorithm</span>{" "}
            allows.
          </h1>
          <p className="mt-6 text-base md:text-lg text-muted-foreground max-w-2xl leading-relaxed">
            From household names to one-demo-wonders rotting on a Bandcamp page
            since 2009 &mdash; an AI orchestrator built for the underground
            rock and metal scene. Discover bands. Find concerts. Read
            sourced, verified writing.
          </p>

          <div className="mt-10 max-w-3xl">
            <DiscoveryHero />
          </div>

          <div className="mt-8 flex flex-wrap gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
            <span>Try:</span>
            {[
              "Atmospheric black metal about nature",
              "Death metal Bulgarian underground",
              "Doom with female vocals",
              "Crust punk from Eastern Europe",
            ].map((q) => (
              <Link
                key={q}
                href={`/discover?q=${encodeURIComponent(q)}`}
                className="hover:text-primary transition-colors"
              >
                · {q}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* PILLARS */}
      <section className="container py-20">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-2">
              ⛧ The Four Pillars
            </p>
            <h2 className="font-display text-3xl md:text-4xl">
              One platform. The whole scene.
            </h2>
          </div>
          <Link
            href="/about"
            className="hidden sm:inline-flex items-center gap-1 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
          >
            Manifesto <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {featurePillars.map((p) => (
            <Link key={p.title} href={p.href} className="group">
              <Card className="h-full hover:border-primary/60 transition-colors">
                <CardHeader>
                  <p.icon className="h-6 w-6 text-primary mb-3 group-hover:animate-flicker" />
                  <CardTitle>{p.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{p.description}</CardDescription>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* TRUST */}
      <section className="border-y border-border/60 bg-card/30">
        <div className="container py-16 grid md:grid-cols-3 gap-10">
          <div>
            <ShieldCheck className="h-7 w-7 text-primary mb-4" />
            <h3 className="font-display text-2xl mb-3">Every claim cited.</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Articles must include sources. URLs are archived to{" "}
              <code className="text-foreground">archive.org</code> on
              publication and re-checked monthly. Reviewers and AI scan for
              uncited factual claims before anything goes live.
            </p>
          </div>
          <div>
            <Search className="h-7 w-7 text-primary mb-4" />
            <h3 className="font-display text-2xl mb-3">Underground first.</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Most platforms bury the obscure. We weight the surface-area
              of every band by an explicit{" "}
              <em>underground score</em> — the lower the streaming numbers,
              the more we surface. Major-label records aren&apos;t blacklisted,
              they just don&apos;t crowd out a Romanian raw black-metal demo.
            </p>
          </div>
          <div>
            <Newspaper className="h-7 w-7 text-primary mb-4" />
            <h3 className="font-display text-2xl mb-3">Open editorial.</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Anyone can pitch. Three roles: reader, author, editor. AI
              moderation does a first pass; an editor signs off. Authors get
              revenue share on premium reads they&apos;ve written.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container py-20 text-center">
        <div className="divider-cross font-display text-xs uppercase tracking-[0.4em]">
          ⛧ Join the rite ⛧
        </div>
        <h2 className="font-display text-4xl md:text-5xl mt-6 mb-4">
          Built for the scene. Owned by no label.
        </h2>
        <p className="text-muted-foreground max-w-xl mx-auto mb-8">
          Sign in to follow bands, save concerts, write articles, and unlock
          the deep archive.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild variant="spike" size="lg">
            <Link href="/auth/signup">Create account</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/discover">Try discovery</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
