"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

interface DraftItem {
  bandId: string;
  bandSlug: string;
  bandName: string;
  note: string;
}

export function UserListForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<DraftItem[]>([]);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<
    { id: string; slug: string; name: string }[]
  >([]);

  const search = async (q: string) => {
    setQuery(q);
    if (q.length < 2) {
      setResults([]);
      return;
    }
    // Re-use the public search endpoint (no admin gate) for band autocomplete.
    const res = await fetch(`/api/bands/search?q=${encodeURIComponent(q)}`);
    if (res.ok) {
      const j = await res.json();
      setResults(j.bands ?? []);
    }
  };

  const add = (b: { id: string; slug: string; name: string }) => {
    if (items.some((it) => it.bandId === b.id)) return;
    setItems([
      ...items,
      { bandId: b.id, bandSlug: b.slug, bandName: b.name, note: "" },
    ]);
    setQuery("");
    setResults([]);
  };

  const swap = (i: number, j: number) => {
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    setItems(next);
  };

  const submit = () => {
    if (!title.trim() || items.length === 0) {
      toast.error("Add a title and at least one band");
      return;
    }
    startTransition(async () => {
      const res = await fetch("/api/lists", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || undefined,
          items: items.map((it, idx) => ({
            bandId: it.bandId,
            position: idx,
            note: it.note || undefined,
          })),
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(j.error ?? "Failed");
        return;
      }
      const j = await res.json();
      toast.success("List published");
      router.push(`/lists/${j.list.slug}`);
    });
  };

  return (
    <div className="space-y-4">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="List title — e.g. My favourite Polish black metal"
        className="text-xl h-12 font-display"
        maxLength={200}
      />
      <Textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="A line or two introducing the list (optional)"
        rows={3}
        maxLength={2000}
      />

      <div className="border border-border rounded-sm p-4 space-y-3">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Bands ({items.length})
        </p>

        {items.map((it, i) => (
          <Card key={it.bandId}>
            <CardContent className="py-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  #{i + 1} {it.bandName}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => swap(i, i - 1)}
                    disabled={i === 0}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                    aria-label="Up"
                    type="button"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => swap(i, i + 1)}
                    disabled={i === items.length - 1}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                    aria-label="Down"
                    type="button"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() =>
                      setItems(items.filter((_, j) => j !== i))
                    }
                    className="text-muted-foreground hover:text-destructive ml-1"
                    aria-label="Remove"
                    type="button"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <Textarea
                placeholder="Why this band? (optional)"
                rows={2}
                value={it.note}
                onChange={(e) => {
                  const next = [...items];
                  next[i] = { ...next[i], note: e.target.value };
                  setItems(next);
                }}
              />
            </CardContent>
          </Card>
        ))}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => search(e.target.value)}
            placeholder="Add a band..."
            className="pl-9"
          />
          {results.length > 0 && (
            <ul className="absolute z-10 left-0 right-0 mt-1 bg-card border border-border rounded-sm max-h-60 overflow-auto">
              {results.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => add(r)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-secondary"
                  >
                    <Plus className="h-3 w-3 inline mr-1.5" />
                    {r.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t border-border/60">
        <Button variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button
          variant="spike"
          onClick={submit}
          disabled={pending || !title || items.length === 0}
        >
          {pending ? "Publishing..." : "Publish list"}
        </Button>
      </div>
    </div>
  );
}
