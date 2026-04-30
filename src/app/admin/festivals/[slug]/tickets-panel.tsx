"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import type { TicketProvider } from "@prisma/client";

interface Ticket {
  id: string;
  provider: TicketProvider;
  url: string;
  passType: string | null;
  priceMinor: number | null;
  currency: string | null;
  available: boolean;
}

const PROVIDERS: TicketProvider[] = [
  "TICKETPRO",
  "EVENTIM",
  "SEETICKETS",
  "TICKETMASTER",
  "DICE",
  "BANDCAMP",
  "DIRECT",
  "OTHER",
];

export function TicketsPanel({
  festivalId,
  initial,
}: {
  festivalId: string;
  initial: Ticket[];
}) {
  const [items, setItems] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState({
    provider: "DIRECT" as TicketProvider,
    url: "",
    passType: "",
    price: "",
    currency: "EUR",
  });

  const create = () => {
    if (!draft.url) return;
    startTransition(async () => {
      const res = await fetch("/api/admin/festival-tickets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          festivalId,
          provider: draft.provider,
          url: draft.url,
          passType: draft.passType || null,
          priceMinor: draft.price ? Math.round(Number(draft.price) * 100) : null,
          currency: draft.currency || null,
        }),
      });
      if (!res.ok) {
        toast.error("Failed");
        return;
      }
      const j = await res.json();
      setItems([...items, j.ticket]);
      setDraft({ provider: "DIRECT", url: "", passType: "", price: "", currency: "EUR" });
      toast.success("Added");
    });
  };

  const remove = (id: string) => {
    if (!confirm("Delete this ticket link?")) return;
    startTransition(async () => {
      const res = await fetch(`/api/admin/festival-tickets/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast.error("Failed");
        return;
      }
      setItems((prev) => prev.filter((t) => t.id !== id));
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Tickets ({items.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 && (
          <p className="text-xs text-muted-foreground italic">
            No ticket links yet.
          </p>
        )}
        {items.map((t) => (
          <div
            key={t.id}
            className="flex items-baseline justify-between border-b border-border/40 py-2 gap-2"
          >
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {t.provider.toLowerCase()}
                {t.passType ? ` · ${t.passType}` : ""}
              </p>
              <p className="text-xs truncate font-mono">{t.url}</p>
              {t.priceMinor != null && (
                <p className="text-xs text-primary font-mono">
                  {(t.priceMinor / 100).toFixed(2)} {t.currency ?? ""}
                </p>
              )}
            </div>
            <button
              onClick={() => remove(t.id)}
              className="text-muted-foreground hover:text-destructive"
              aria-label="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}

        <div className="border-t border-border/60 pt-3 space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Add ticket
          </p>
          <select
            value={draft.provider}
            onChange={(e) =>
              setDraft({ ...draft, provider: e.target.value as TicketProvider })
            }
            className="h-10 w-full bg-background/60 border border-input rounded-sm px-3 text-xs uppercase tracking-widest"
          >
            {PROVIDERS.map((p) => (
              <option key={p} value={p}>
                {p.toLowerCase()}
              </option>
            ))}
          </select>
          <Input
            placeholder="URL"
            value={draft.url}
            onChange={(e) => setDraft({ ...draft, url: e.target.value })}
          />
          <div className="grid grid-cols-3 gap-2">
            <Input
              placeholder="Pass type (3-day, VIP)"
              value={draft.passType}
              onChange={(e) => setDraft({ ...draft, passType: e.target.value })}
              className="col-span-2"
            />
            <Input
              type="number"
              step="0.01"
              placeholder="Price"
              value={draft.price}
              onChange={(e) => setDraft({ ...draft, price: e.target.value })}
            />
          </div>
          <Input
            placeholder="Currency (EUR, BGN, USD)"
            value={draft.currency}
            maxLength={3}
            onChange={(e) =>
              setDraft({ ...draft, currency: e.target.value.toUpperCase() })
            }
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={create}
            disabled={pending || !draft.url}
          >
            <Plus className="h-3 w-3" /> Add
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
