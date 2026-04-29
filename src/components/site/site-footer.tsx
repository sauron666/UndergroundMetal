import Link from "next/link";
import { Separator } from "@/components/ui/separator";

const cols: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Explore",
    links: [
      { href: "/discover", label: "AI Discovery" },
      { href: "/bands", label: "Bands" },
      { href: "/concerts", label: "Concerts" },
      { href: "/articles", label: "Articles" },
      { href: "/genres", label: "Genres" },
    ],
  },
  {
    title: "Community",
    links: [
      { href: "/auth/signin", label: "Sign in" },
      { href: "/auth/signup", label: "Become an author" },
      { href: "/contribute", label: "Contribute" },
      { href: "/guidelines", label: "Editorial guidelines" },
    ],
  },
  {
    title: "Underground",
    links: [
      { href: "/bg-archive", label: "Bulgarian archive" },
      { href: "/zine", label: "Zine" },
      { href: "/premium", label: "Premium" },
      { href: "/about", label: "About" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/legal/terms", label: "Terms" },
      { href: "/legal/privacy", label: "Privacy" },
      { href: "/legal/dmca", label: "DMCA" },
      { href: "/legal/cookies", label: "Cookies" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 mt-16">
      <div className="container py-12 grid grid-cols-2 md:grid-cols-5 gap-8">
        <div className="col-span-2 md:col-span-1 space-y-3">
          <Link
            href="/"
            className="font-blackletter text-4xl text-primary text-shadow-blood inline-block leading-none"
          >
            U.M.
          </Link>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
            Built by metalheads, for metalheads. Mainstream &amp; deep
            underground &mdash; verified, sourced, and uncompromising.
          </p>
        </div>
        {cols.map((c) => (
          <div key={c.title} className="space-y-3">
            <h3 className="text-[11px] uppercase tracking-[0.25em] font-display text-foreground">
              {c.title}
            </h3>
            <ul className="space-y-2">
              {c.links.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <Separator />
      <div className="container py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[10px] uppercase tracking-widest text-muted-foreground">
        <span>&copy; {new Date().getFullYear()} Underground Metal</span>
        <span>
          Hails to the underground · No gods, no masters · Keep it true
        </span>
      </div>
    </footer>
  );
}
