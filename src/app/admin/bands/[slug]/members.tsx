"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface Member {
  id: string;
  role: string;
  current: boolean;
  fromYear: number | null;
  toYear: number | null;
  person: { id: string; name: string };
}

const ROLES = ["VOCALS", "GUITAR", "BASS", "DRUMS", "KEYBOARDS", "OTHER"] as const;

export function MembersPanel({
  bandId,
  initial,
}: {
  bandId: string;
  initial: Member[];
}) {
  const [items, setItems] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState({
    name: "",
    role: "GUITAR" as (typeof ROLES)[number],
    fromYear: "",
    current: true,
  });

  const create = () => {
    if (!draft.name) return;
    startTransition(async () => {
      const res = await fetch("/api/admin/members", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          bandId,
          personName: draft.name,
          role: draft.role,
          current: draft.current,
          fromYear: draft.fromYear ? Number(draft.fromYear) : null,
        }),
      });
      if (!res.ok) {
        toast.error("Failed");
        return;
      }
      const j = await res.json();
      setItems([...items, j.member]);
      setDraft({ name: "", role: "GUITAR", fromYear: "", current: true });
      toast.success("Added");
    });
  };

  const remove = (id: string) => {
    if (!confirm("Remove this member?")) return;
    startTransition(async () => {
      const res = await fetch(`/api/admin/members/${id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Failed");
        return;
      }
      setItems((prev) => prev.filter((m) => m.id !== id));
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Members</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 && (
          <p className="text-xs text-muted-foreground italic">No members.</p>
        )}
        {items.map((m) => (
          <div
            key={m.id}
            className="flex items-baseline justify-between border-b border-border/40 py-2 gap-2"
          >
            <div>
              <p className="font-medium">{m.person.name}</p>
              <p className="text-xs text-muted-foreground">
                {m.role.toLowerCase()} · {m.current ? "current" : "former"}
                {m.fromYear ? ` · ${m.fromYear}–${m.toYear ?? "now"}` : ""}
              </p>
            </div>
            <button
              onClick={() => remove(m.id)}
              className="text-muted-foreground hover:text-destructive"
              aria-label="Remove"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}

        <div className="border-t border-border/60 pt-3 space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Add member
          </p>
          <Input
            placeholder="Name"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={draft.role}
              onChange={(e) =>
                setDraft({ ...draft, role: e.target.value as typeof draft.role })
              }
              className="h-10 bg-background/60 border border-input rounded-sm px-3 text-xs uppercase tracking-widest"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r.toLowerCase()}
                </option>
              ))}
            </select>
            <Input
              type="number"
              placeholder="Joined year"
              value={draft.fromYear}
              onChange={(e) => setDraft({ ...draft, fromYear: e.target.value })}
            />
          </div>
          <label className="inline-flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={draft.current}
              onChange={(e) =>
                setDraft({ ...draft, current: e.target.checked })
              }
              className="accent-primary"
            />
            <span>Current member</span>
          </label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={create}
            disabled={pending || !draft.name}
          >
            <Plus className="h-3 w-3" /> Add
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
