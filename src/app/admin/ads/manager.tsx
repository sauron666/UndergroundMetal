"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Placement {
  id: string;
  slug: string;
  name: string;
  html: string | null;
  active: boolean;
}

export function AdsManager({ initial }: { initial: Placement[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState({ slug: "", name: "" });

  const create = () => {
    if (!draft.slug || !draft.name) return;
    startTransition(async () => {
      const res = await fetch("/api/admin/ads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) {
        toast.error("Failed");
        return;
      }
      const j = await res.json();
      setItems([...items, j.placement]);
      setDraft({ slug: "", name: "" });
      router.refresh();
    });
  };

  const update = (id: string, patch: Partial<Placement>) => {
    startTransition(async () => {
      const res = await fetch(`/api/admin/ads/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        toast.error("Failed");
        return;
      }
      setItems((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...patch } : p))
      );
      toast.success("Saved");
    });
  };

  const remove = (id: string) => {
    if (!confirm("Delete this placement?")) return;
    startTransition(async () => {
      const res = await fetch(`/api/admin/ads/${id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Failed");
        return;
      }
      setItems((prev) => prev.filter((p) => p.id !== id));
    });
  };

  return (
    <div className="space-y-4">
      {items.map((p) => (
        <Card key={p.id}>
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="text-base font-mono">{p.slug}</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">{p.name}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={p.active ? "blood" : "ghost"}>
                  {p.active ? "active" : "inactive"}
                </Badge>
                <button
                  onClick={() => remove(p.id)}
                  className="p-1.5 hover:text-destructive"
                  aria-label="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <Textarea
              defaultValue={p.html ?? ""}
              placeholder="Vendor tag or HTML..."
              rows={4}
              className="font-mono text-xs"
              onBlur={(e) => {
                if (e.target.value !== p.html) {
                  update(p.id, { html: e.target.value });
                }
              }}
            />
            <label className="inline-flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={p.active}
                onChange={(e) => update(p.id, { active: e.target.checked })}
                className="accent-primary"
              />
              <span>Active</span>
            </label>
          </CardContent>
        </Card>
      ))}

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">New placement</CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-[1fr_1fr_auto] gap-2">
          <Input
            placeholder="slug (e.g. home-hero)"
            value={draft.slug}
            onChange={(e) =>
              setDraft({ ...draft, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })
            }
          />
          <Input
            placeholder="display name"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
          <Button variant="spike" onClick={create} disabled={pending}>
            <Plus className="h-3.5 w-3.5" /> Create
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
