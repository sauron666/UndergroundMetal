import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

export const metadata: Metadata = {
  title: "People",
  description:
    "Members, vocalists, drummers, producers — the people behind the bands.",
};

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function PeopleIndex({ searchParams }: PageProps) {
  const { q } = await searchParams;
  const where = q
    ? { name: { contains: q, mode: "insensitive" as const } }
    : {};
  const people = await db.person
    .findMany({
      where,
      include: { _count: { select: { bands: true } } },
      orderBy: { name: "asc" },
      take: 100,
    })
    .catch(() => []);

  return (
    <div className="container py-10 md:py-14 max-w-4xl">
      <header className="flex items-end justify-between mb-8 gap-4 flex-wrap">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-2">
            ⛧ People
          </p>
          <h1 className="font-display text-4xl md:text-5xl">People.</h1>
        </div>
        <form action="/people" className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              name="q"
              defaultValue={q ?? ""}
              placeholder="Search..."
              className="pl-9 w-56"
            />
          </div>
          <Button type="submit" size="sm" variant="outline">
            Search
          </Button>
        </form>
      </header>

      {people.length === 0 ? (
        <p className="text-center text-muted-foreground italic py-16">
          {q ? `No people matched "${q}".` : "No people catalogued yet."}
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {people.map((p) => (
            <Link key={p.id} href={`/people/${p.slug}`} className="block">
              <Card className="hover:border-primary/60 transition-colors">
                <CardContent className="py-3">
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {p.countryCode ? `[${p.countryCode}]` : ""}
                    {p.bornYear ? ` · b. ${p.bornYear}` : ""}
                    {" · "}
                    {p._count.bands} band{p._count.bands === 1 ? "" : "s"}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
