import Link from "next/link";
import { Flame, Search, Ticket, Newspaper, Skull, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getDictionary, getLocale } from "@/i18n";
import { LocaleSwitcher } from "./locale-switcher";

export async function SiteHeader() {
  const t = await getDictionary();
  const locale = await getLocale();
  const navItems = [
    { href: "/discover", label: t.nav.discover, icon: Flame },
    { href: "/bands", label: t.nav.bands, icon: Skull },
    { href: "/concerts", label: t.nav.concerts, icon: Ticket },
    { href: "/articles", label: t.nav.articles, icon: Newspaper },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center gap-6">
        <Link href="/" className="flex items-center gap-2 group">
          <span
            className="font-blackletter text-3xl text-primary group-hover:text-blood-glow transition-colors text-shadow-blood leading-none"
            aria-label="Underground Metal"
          >
            U.M.
          </span>
          <span className="hidden sm:flex flex-col leading-none">
            <span className="font-display text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              Underground
            </span>
            <span className="font-display text-sm uppercase tracking-[0.4em] text-foreground">
              Metal
            </span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
              )}
            >
              <item.icon className="h-3.5 w-3.5" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3 ml-auto">
          <LocaleSwitcher current={locale} />
          <Button asChild variant="ghost" size="icon" aria-label="Search">
            <Link href="/search">
              <Search className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
            <Link href="/auth/signin">
              <User className="h-3.5 w-3.5" />
              {t.nav.signin}
            </Link>
          </Button>
          <Button asChild variant="spike" size="sm" className="hidden sm:inline-flex">
            <Link href="/discover">{t.nav.summon}</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
