"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Genre {
  id: string;
  slug: string;
  name: string;
  heaviness: number;
  parentId: string | null;
  bandCount: number;
}

export function GenresManager({ initial }: { initial: Genre[] }) {
  const [items, setItems] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState({ slug: "", name: "", heaviness: 5, parentId: "" });

  const create = () => {
    if (!draft.slug || !draft.name) return;
    startTransition(async () => {
      const res = await fetch("/api/admin/genres", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slug: draft.slug,
          name: draft.name,
          heaviness: draft.heaviness,
          parentId: draft.parentId || null,
        }),
      });
      if (!res.ok) {
        toast.error("Failed");
        return;
      }
      const j = await res.json();
      setItems([...items, { ...j.genre, bandCount: 0 }]);
      setDraft({ slug: "", name: "", heaviness: 5, parentId: "" });
    });
  };

  const remove = (id: string) => {
    if (!confirm("Delete this genre?")) return;
    startTransition(async () => {
      const res = await fetch(`/api/admin/genres/${id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Failed");
        return;
      }
      setItems((prev) => prev.filter((g) => g.id !== id));
    });
  };

  return (
    <div className="space-y-6">
      <div className="border border-border rounded-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-card/60 border-b border-border">
            <tr className="text-left text-[10px] uppercase tracking-widest text-muted-foreground">
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Slug</th>
              <th className="px-3 py-2">Parent</th>
              <th className="px-3 py-2">Heaviness</th>
              <th className="px-3 py-2">Bands</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((g) => (
              <tr key={g.id} className="border-b border-border/40">
                <td className="px-3 py-2 font-medium">{g.name}</td>
                <td className="px-3 py-2 font-mono text-xs">{g.slug}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {g.parentId ? items.find((i) => i.id === g.parentId)?.name : "—"}
                </td>
                <td className="px-3 py-2 font-mono text-xs">{g.heaviness}/10</td>
                <td className="px-3 py-2 font-mono text-xs">{g.bandCount}</td>
                <td className="px-3 py-2 text-right">
                  <button
                    onClick={() => remove(g.id)}
                    className="hover:text-destructive"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border border-dashed border-border rounded-sm p-4">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3">
          New genre
        </p>
        <div className="grid sm:grid-cols-[1fr_1fr_1fr_120px_auto] gap-2">
          <Input
            placeholder="slug"
            value={draft.slug}
            onChange={(e) =>
              setDraft({ ...draft, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })
            }
          />
          <Input
            placeholder="name"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
          <select
            value={draft.parentId}
            onChange={(e) => setDraft({ ...draft, parentId: e.target.value })}
            className="h-10 bg-background/60 border border-input rounded-sm px-3 text-sm"
          >
            <option value="">No parent</option>
            {items.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <Input
            type="number"
            min={1}
            max={10}
            value={draft.heaviness}
            onChange={(e) => setDraft({ ...draft, heaviness: Number(e.target.value) })}
            placeholder="heaviness"
          />
          <Button variant="spike" onClick={create} disabled={pending}>
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
        </div>
      </div>
    </div>
  );
}
