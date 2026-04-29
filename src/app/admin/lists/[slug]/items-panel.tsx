"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Plus, Trash2, ArrowUp, ArrowDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface Item {
  bandId: string;
  bandSlug: string;
  bandName: string;
  position: number;
  note: string | null;
}

export function ListItemsPanel({
  listId,
  initial,
}: {
  listId: string;
  initial: Item[];
}) {
  const [items, setItems] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<
    { id: string; slug: string; name: string }[]
  >([]);
  const [picked, setPicked] = useState<{ id: string; slug: string; name: string } | null>(null);
  const [note, setNote] = useState("");

  const search = async (q: string) => {
    setQuery(q);
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const res = await fetch(`/api/admin/bands/search?q=${encodeURIComponent(q)}`);
    if (res.ok) {
      const j = await res.json();
      setResults(j.bands ?? []);
    }
  };

  const add = () => {
    if (!picked) return;
    const nextPos = (items[items.length - 1]?.position ?? -1) + 1;
    startTransition(async () => {
      const res = await fetch("/api/admin/list-items", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          listId,
          bandId: picked.id,
          position: nextPos,
          note: note || null,
        }),
      });
      if (!res.ok) {
        toast.error("Failed");
        return;
      }
      setItems([
        ...items,
        {
          bandId: picked.id,
          bandSlug: picked.slug,
          bandName: picked.name,
          position: nextPos,
          note: note || null,
        },
      ]);
      setPicked(null);
      setQuery("");
      setNote("");
      setResults([]);
      toast.success("Added");
    });
  };

  const remove = (bandId: string) => {
    startTransition(async () => {
      const res = await fetch(
        `/api/admin/list-items?listId=${listId}&bandId=${bandId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        toast.error("Failed");
        return;
      }
      setItems((prev) => prev.filter((i) => i.bandId !== bandId));
    });
  };

  const swap = (i: number, j: number) => {
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    const a = next[i];
    const b = next[j];
    [next[i], next[j]] = [next[j], next[i]];
    const aPos = a.position;
    next[i].position = b.position;
    next[j].position = aPos;
    setItems(next);
    startTransition(async () => {
      await Promise.all([
        fetch("/api/admin/list-items", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            listId,
            bandId: next[i].bandId,
            position: next[i].position,
          }),
        }),
        fetch("/api/admin/list-items", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            listId,
            bandId: next[j].bandId,
            position: next[j].position,
          }),
        }),
      ]);
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Items ({items.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 && (
          <p className="text-xs text-muted-foreground italic">
            No bands on the list yet.
          </p>
        )}
        {items.map((it, i) => (
          <div
            key={it.bandId}
            className="border-b border-border/40 py-2 space-y-1"
          >
            <div className="flex items-baseline justify-between gap-2">
              <Link
                href={`/admin/bands/${it.bandSlug}`}
                className="font-medium hover:text-primary"
              >
                #{i + 1} {it.bandName}
              </Link>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => swap(i, i - 1)}
                  disabled={i === 0 || pending}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                  aria-label="Up"
                >
                  <ArrowUp className="h-3 w-3" />
                </button>
                <button
                  onClick={() => swap(i, i + 1)}
                  disabled={i === items.length - 1 || pending}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                  aria-label="Down"
                >
                  <ArrowDown className="h-3 w-3" />
                </button>
                <button
                  onClick={() => remove(it.bandId)}
                  className="text-muted-foreground hover:text-destructive ml-1"
                  aria-label="Remove"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
            {it.note && (
              <p className="text-xs text-muted-foreground italic">{it.note}</p>
            )}
          </div>
        ))}

        <div className="border-t border-border/60 pt-3 space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Add band
          </p>
          {picked ? (
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{picked.name}</span>
              <button
                onClick={() => {
                  setPicked(null);
                  setQuery("");
                }}
                className="text-muted-foreground hover:text-destructive text-xs"
              >
                clear
              </button>
            </div>
          ) : (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => search(e.target.value)}
                placeholder="Search bands..."
                className="pl-9"
              />
              {results.length > 0 && (
                <ul className="absolute z-10 left-0 right-0 mt-1 bg-card border border-border rounded-sm max-h-60 overflow-auto">
                  {results.map((r) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setPicked(r);
                          setResults([]);
                          setQuery(r.name);
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-secondary"
                      >
                        {r.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Curator note (optional)"
            rows={2}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={add}
            disabled={pending || !picked}
          >
            <Plus className="h-3 w-3" /> Add
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
