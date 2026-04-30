"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Plus, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface SeriesArticle {
  id: string;
  slug: string;
  title: string;
  status: string;
  seriesPart: number | null;
}

export function SeriesArticlesPanel({
  seriesId,
  initial,
}: {
  seriesId: string;
  initial: SeriesArticle[];
}) {
  const [items, setItems] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<
    { id: string; slug: string; title: string }[]
  >([]);
  const [partInput, setPartInput] = useState("");

  const search = async (q: string) => {
    setQuery(q);
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const res = await fetch(
      `/api/admin/articles/search?q=${encodeURIComponent(q)}`
    );
    if (res.ok) {
      const j = await res.json();
      setResults(j.articles ?? []);
    }
  };

  const attach = (articleId: string) => {
    const part = partInput ? Number(partInput) : null;
    startTransition(async () => {
      const res = await fetch("/api/admin/series/articles", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          seriesId,
          articleId,
          seriesPart: part,
        }),
      });
      if (!res.ok) {
        toast.error("Attach failed");
        return;
      }
      const j = await res.json();
      setItems(
        [
          ...items,
          {
            id: j.article.id,
            slug: j.article.slug,
            title: j.article.title,
            status: j.article.status,
            seriesPart: j.article.seriesPart,
          },
        ].sort((a, b) => (a.seriesPart ?? 999) - (b.seriesPart ?? 999))
      );
      setQuery("");
      setResults([]);
      setPartInput("");
      toast.success("Attached");
    });
  };

  const detach = (articleId: string) => {
    startTransition(async () => {
      const res = await fetch("/api/admin/series/articles", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ articleId }),
      });
      if (!res.ok) {
        toast.error("Detach failed");
        return;
      }
      setItems((prev) => prev.filter((a) => a.id !== articleId));
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          Articles ({items.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 && (
          <p className="text-xs text-muted-foreground italic">
            No articles attached.
          </p>
        )}
        {items.map((a) => (
          <div
            key={a.id}
            className="flex items-baseline justify-between border-b border-border/40 py-2 gap-2"
          >
            <div>
              <Link
                href={`/articles/${a.slug}`}
                className="font-medium hover:text-primary"
              >
                {a.seriesPart != null ? `${a.seriesPart}. ` : ""}
                {a.title}
              </Link>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                <Badge variant="ghost">{a.status.toLowerCase()}</Badge>
              </p>
            </div>
            <button
              onClick={() => detach(a.id)}
              className="text-muted-foreground hover:text-destructive"
              aria-label="Detach"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}

        <div className="border-t border-border/60 pt-3 space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Attach article
          </p>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => search(e.target.value)}
                placeholder="Search articles..."
                className="pl-9"
              />
              {results.length > 0 && (
                <ul className="absolute z-10 left-0 right-0 mt-1 bg-card border border-border rounded-sm max-h-60 overflow-auto">
                  {results.map((r) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => attach(r.id)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-secondary"
                      >
                        <Plus className="h-3 w-3 inline mr-1.5" />
                        {r.title}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <Input
              type="number"
              placeholder="Part"
              value={partInput}
              onChange={(e) => setPartInput(e.target.value)}
              min={1}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
