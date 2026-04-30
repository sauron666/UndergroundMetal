import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Skull, Newspaper, Music, Theater, Megaphone, Activity, Flag, BarChart3, CalendarRange, ListChecks, UserPlus } from "lucide-react";

const NAV = [
  { href: "/admin", label: "Overview", icon: Activity },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/moderation", label: "Articles", icon: Newspaper },
  { href: "/admin/applications", label: "Applications", icon: UserPlus },
  { href: "/admin/bands", label: "Bands", icon: Skull },
  { href: "/admin/genres", label: "Genres", icon: Music },
  { href: "/admin/festivals", label: "Festivals", icon: CalendarRange },
  { href: "/admin/lists", label: "Lists", icon: ListChecks },
  { href: "/admin/venues", label: "Venues", icon: Theater },
  { href: "/admin/ads", label: "Ad placements", icon: Megaphone },
  { href: "/admin/scrape-runs", label: "Scrape runs", icon: Activity },
  { href: "/admin/reports", label: "Reports", icon: Flag },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin?next=/admin");
  if (!["EDITOR", "ADMIN"].includes(session.user.role)) {
    return (
      <div className="container py-20 text-center">
        <h1 className="font-display text-3xl mb-2">Forbidden</h1>
        <p className="text-muted-foreground">Editor or admin role required.</p>
      </div>
    );
  }

  return (
    <div className="container py-8 grid md:grid-cols-[200px_1fr] gap-8">
      <aside className="md:sticky md:top-20 self-start">
        <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-4">
          ⛧ Admin
        </p>
        <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="flex items-center gap-2 px-3 py-2 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-secondary rounded-sm whitespace-nowrap"
            >
              <n.icon className="h-3.5 w-3.5" /> {n.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main>{children}</main>
    </div>
  );
}
