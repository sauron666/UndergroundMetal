import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ListChecks } from "lucide-react";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Curated lists",
  description:
    "Year-end best-of lists, scene primers, and editor staff picks.",
};

interface PageProps {
  searchParams: Promise<{ kind?: string; year?: string }>;
}

const KINDS = [
  { value: "BEST_OF", label: "Best of" },
  { value: "PRIMER", label: "Primers" },
  { value: "STAFF_PICK", label: "Staff picks" },
];

export default async function ListsPage({ searchParams }: PageProps) {
  const { kind, year } = await searchParams;

  const where = {
    published: true,
    ...(kind && KINDS.find((k) => k.value === kind) ? { kind: kind as never } : {}),
    ...(year ? { year: Number(year) } : {}),
  };

  const lists = await db.bandList
    .findMany({
      where,
      include: {
        curator: { select: { username: true, name: true } },
        _count: { select: { items: true } },
      },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take: 60,
    })
    .catch(() => []);

  return (
    <div className="container py-10 md:py-14 max-w-4xl">
      <header className="mb-8">
        <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-2 flex items-center gap-1.5">
          <ListChecks className="h-3 w-3" /> Curated
        </p>
        <h1 className="font-display text-4xl md:text-5xl">Lists.</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Year-end best-of, scene primers, staff picks.
        </p>
      </header>

      <div className="flex flex-wrap gap-2 mb-6">
        <Link
          href="/lists"
          className={
            !kind
              ? "text-[10px] uppercase tracking-widest text-primary"
              : "text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
          }
        >
          All
        </Link>
        {KINDS.map((k) => (
          <Link
            key={k.value}
            href={`/lists?kind=${k.value}`}
            className={
              kind === k.value
                ? "text-[10px] uppercase tracking-widest text-primary"
                : "text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
            }
          >
            {k.label}
          </Link>
        ))}
      </div>

      {lists.length === 0 ? (
        <p className="text-center text-muted-foreground italic py-20">
          No lists published in this filter.
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {lists.map((l) => (
            <Link key={l.id} href={`/lists/${l.slug}`} className="block">
              <Card className="hover:border-primary/60 transition-colors h-full">
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="rust">
                      {l.kind.replace("_", " ").toLowerCase()}
                    </Badge>
                    {l.year && <Badge variant="outline">{l.year}</Badge>}
                  </div>
                  <CardTitle>{l.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  {l.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {l.description}
                    </p>
                  )}
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    {l._count.items} band{l._count.items === 1 ? "" : "s"} · by{" "}
                    {l.curator.username ?? l.curator.name ?? "anon"}
                    {l.publishedAt && (
                      <> · {formatDate(l.publishedAt)}</>
                    )}
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
