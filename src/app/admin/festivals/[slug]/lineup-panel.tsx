"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Plus, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface Booking {
  bandId: string;
  bandSlug: string;
  bandName: string;
  position: number;
  day: number | null;
  stage: string | null;
}

export function LineupPanel({
  festivalId,
  initial,
}: {
  festivalId: string;
  initial: Booking[];
}) {
  const [items, setItems] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<
    { id: string; slug: string; name: string }[]
  >([]);
  const [draft, setDraft] = useState({ position: 99, day: "", stage: "" });
  const [picked, setPicked] = useState<{ id: string; name: string } | null>(null);

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
    startTransition(async () => {
      const res = await fetch("/api/admin/festival-bookings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          festivalId,
          bandId: picked.id,
          position: draft.position,
          day: draft.day ? Number(draft.day) : null,
          stage: draft.stage || null,
        }),
      });
      if (!res.ok) {
        toast.error("Failed");
        return;
      }
      const j = await res.json();
      setItems([
        ...items,
        {
          bandId: picked.id,
          bandSlug: j.booking.bandSlug,
          bandName: picked.name,
          position: draft.position,
          day: draft.day ? Number(draft.day) : null,
          stage: draft.stage || null,
        },
      ]);
      setPicked(null);
      setQuery("");
      setResults([]);
      setDraft({ position: 99, day: "", stage: "" });
      toast.success("Added");
    });
  };

  const remove = (bandId: string) => {
    startTransition(async () => {
      const res = await fetch(
        `/api/admin/festival-bookings?festivalId=${festivalId}&bandId=${bandId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        toast.error("Failed");
        return;
      }
      setItems((prev) => prev.filter((b) => b.bandId !== bandId));
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Line-up ({items.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 && (
          <p className="text-xs text-muted-foreground italic">
            No bookings yet.
          </p>
        )}
        {items.map((b) => (
          <div
            key={b.bandId}
            className="flex items-baseline justify-between border-b border-border/40 py-2 gap-2"
          >
            <div>
              <Link
                href={`/admin/bands/${b.bandSlug}`}
                className="font-medium hover:text-primary"
              >
                {b.bandName}
              </Link>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
                pos {b.position}
                {b.day ? ` · day ${b.day}` : ""}
                {b.stage ? ` · ${b.stage}` : ""}
              </p>
            </div>
            <button
              onClick={() => remove(b.bandId)}
              className="text-muted-foreground hover:text-destructive"
              aria-label="Remove"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
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
                onClick={() => setPicked(null)}
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
                          setPicked({ id: r.id, name: r.name });
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
          <div className="grid grid-cols-3 gap-2">
            <Input
              type="number"
              placeholder="Position"
              value={draft.position}
              onChange={(e) =>
                setDraft({ ...draft, position: Number(e.target.value) })
              }
              min={0}
            />
            <Input
              type="number"
              placeholder="Day"
              value={draft.day}
              onChange={(e) => setDraft({ ...draft, day: e.target.value })}
              min={1}
              max={14}
            />
            <Input
              placeholder="Stage"
              value={draft.stage}
              onChange={(e) => setDraft({ ...draft, stage: e.target.value })}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={add}
            disabled={pending || !picked}
          >
            <Plus className="h-3 w-3" /> Book
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
