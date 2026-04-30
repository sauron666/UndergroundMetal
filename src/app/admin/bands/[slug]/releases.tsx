"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Plus, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface Release {
  id: string;
  title: string;
  type: string;
  year: number | null;
  bandcampUrl: string | null;
  coverUrl: string | null;
}

const TYPES = [
  "FULL_LENGTH",
  "EP",
  "DEMO",
  "SPLIT",
  "COMPILATION",
  "LIVE",
  "SINGLE",
] as const;

export function ReleasesPanel({
  bandId,
  bandSlug,
  initial,
}: {
  bandId: string;
  bandSlug: string;
  initial: Release[];
}) {
  const [items, setItems] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState({
    title: "",
    type: "FULL_LENGTH" as (typeof TYPES)[number],
    year: "",
    bandcampUrl: "",
  });

  const create = () => {
    if (!draft.title) return;
    startTransition(async () => {
      const res = await fetch("/api/admin/releases", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          bandId,
          title: draft.title,
          type: draft.type,
          year: draft.year ? Number(draft.year) : null,
          bandcampUrl: draft.bandcampUrl || null,
        }),
      });
      if (!res.ok) {
        toast.error("Failed");
        return;
      }
      const j = await res.json();
      setItems([...items, j.release].sort((a, b) => (a.year ?? 0) - (b.year ?? 0)));
      setDraft({ title: "", type: "FULL_LENGTH", year: "", bandcampUrl: "" });
      toast.success("Added");
    });
  };

  const remove = (id: string) => {
    if (!confirm("Delete this release?")) return;
    startTransition(async () => {
      const res = await fetch(`/api/admin/releases/${id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Failed");
        return;
      }
      setItems((prev) => prev.filter((r) => r.id !== id));
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Releases</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 && (
          <p className="text-xs text-muted-foreground italic">
            No releases catalogued.
          </p>
        )}
        {items.map((r) => (
          <div
            key={r.id}
            className="flex items-baseline justify-between border-b border-border/40 py-2 gap-2"
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{r.title}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-widest">
                {r.type.replace("_", " ").toLowerCase()} · {r.year ?? "?"}
              </p>
            </div>
            <Link
              href={`/admin/bands/${bandSlug}/releases/${r.id}`}
              className="text-muted-foreground hover:text-primary"
              aria-label="Edit"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Link>
            <button
              onClick={() => remove(r.id)}
              className="text-muted-foreground hover:text-destructive"
              aria-label="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}

        <div className="border-t border-border/60 pt-3 space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Add release
          </p>
          <Input
            placeholder="Title"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />
          <div className="grid grid-cols-3 gap-2">
            <select
              value={draft.type}
              onChange={(e) =>
                setDraft({ ...draft, type: e.target.value as typeof draft.type })
              }
              className="h-10 bg-background/60 border border-input rounded-sm px-3 text-xs uppercase tracking-widest"
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace("_", " ")}
                </option>
              ))}
            </select>
            <Input
              type="number"
              placeholder="Year"
              value={draft.year}
              onChange={(e) => setDraft({ ...draft, year: e.target.value })}
            />
            <Input
              placeholder="Bandcamp URL"
              value={draft.bandcampUrl}
              onChange={(e) =>
                setDraft({ ...draft, bandcampUrl: e.target.value })
              }
            />
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={create}
            disabled={pending || !draft.title}
          >
            <Plus className="h-3 w-3" /> Add
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function ReleasesPanelHeading() {
  return null;
}
