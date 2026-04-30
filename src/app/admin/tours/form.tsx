"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface DraftRow {
  date: string;
  venueName: string;
  venueSlug: string;
  city: string;
  countryCode: string;
  ticketUrl: string;
  ticketProvider: string;
  pricePerHead: string;
}

const PROVIDERS = [
  "TICKETPRO",
  "EVENTIM",
  "SEETICKETS",
  "TICKETMASTER",
  "DICE",
  "BANDCAMP",
  "DIRECT",
  "OTHER",
];

function emptyRow(): DraftRow {
  return {
    date: "",
    venueName: "",
    venueSlug: "",
    city: "",
    countryCode: "",
    ticketUrl: "",
    ticketProvider: "DIRECT",
    pricePerHead: "",
  };
}

export function TourBatchForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [headliner, setHeadliner] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [supports, setSupports] = useState<{ id: string; name: string }[]>([]);
  const [headlinerQuery, setHeadlinerQuery] = useState("");
  const [supportQuery, setSupportQuery] = useState("");
  const [headlinerResults, setHeadlinerResults] = useState<
    { id: string; slug: string; name: string }[]
  >([]);
  const [supportResults, setSupportResults] = useState<
    { id: string; slug: string; name: string }[]
  >([]);

  const [rows, setRows] = useState<DraftRow[]>([emptyRow()]);

  const search = async (
    q: string,
    setter: (rs: { id: string; slug: string; name: string }[]) => void
  ) => {
    if (q.length < 2) {
      setter([]);
      return;
    }
    const res = await fetch(`/api/admin/bands/search?q=${encodeURIComponent(q)}`);
    if (res.ok) {
      const j = await res.json();
      setter(j.bands ?? []);
    }
  };

  const submit = () => {
    if (!headliner) {
      toast.error("Pick a headliner first");
      return;
    }
    const cleanRows = rows.filter(
      (r) => r.date && (r.venueSlug || (r.venueName && r.city && r.countryCode))
    );
    if (cleanRows.length === 0) {
      toast.error("Add at least one show row with date + venue");
      return;
    }
    startTransition(async () => {
      const res = await fetch("/api/admin/tours", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          headlinerId: headliner.id,
          supportIds: supports.map((s) => s.id),
          shows: cleanRows.map((r) => ({
            date: new Date(r.date).toISOString(),
            venueSlug: r.venueSlug || undefined,
            venueName: r.venueName || undefined,
            city: r.city || undefined,
            countryCode: r.countryCode
              ? r.countryCode.toUpperCase()
              : undefined,
            ticket: r.ticketUrl
              ? {
                  url: r.ticketUrl,
                  provider: r.ticketProvider,
                  priceMinor: r.pricePerHead
                    ? Math.round(Number(r.pricePerHead) * 100)
                    : null,
                }
              : null,
          })),
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(j.error ?? "Failed");
        return;
      }
      const j = await res.json();
      toast.success(`${j.created} shows created${j.skipped ? `, ${j.skipped} skipped` : ""}`);
      router.push("/concerts");
    });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Bands */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Line-up</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Headliner
          </p>
          {headliner ? (
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{headliner.name}</span>
              <button
                onClick={() => setHeadliner(null)}
                className="text-xs text-muted-foreground hover:text-destructive"
              >
                clear
              </button>
            </div>
          ) : (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={headlinerQuery}
                onChange={(e) => {
                  setHeadlinerQuery(e.target.value);
                  search(e.target.value, setHeadlinerResults);
                }}
                placeholder="Search bands..."
                className="pl-9"
              />
              {headlinerResults.length > 0 && (
                <ul className="absolute z-10 left-0 right-0 mt-1 bg-card border border-border rounded-sm max-h-60 overflow-auto">
                  {headlinerResults.map((b) => (
                    <li key={b.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setHeadliner({ id: b.id, name: b.name });
                          setHeadlinerQuery("");
                          setHeadlinerResults([]);
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-secondary"
                      >
                        {b.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <p className="text-[10px] uppercase tracking-widest text-muted-foreground pt-2">
            Supports ({supports.length})
          </p>
          {supports.length > 0 && (
            <ul className="text-sm space-y-1">
              {supports.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between border-b border-border/40 py-1"
                >
                  {s.name}
                  <button
                    onClick={() =>
                      setSupports(supports.filter((x) => x.id !== s.id))
                    }
                    className="text-xs text-muted-foreground hover:text-destructive"
                  >
                    remove
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={supportQuery}
              onChange={(e) => {
                setSupportQuery(e.target.value);
                search(e.target.value, setSupportResults);
              }}
              placeholder="Add support..."
              className="pl-9"
            />
            {supportResults.length > 0 && (
              <ul className="absolute z-10 left-0 right-0 mt-1 bg-card border border-border rounded-sm max-h-60 overflow-auto">
                {supportResults.map((b) => (
                  <li key={b.id}>
                    <button
                      type="button"
                      onClick={() => {
                        if (!supports.some((s) => s.id === b.id)) {
                          setSupports([
                            ...supports,
                            { id: b.id, name: b.name },
                          ]);
                        }
                        setSupportQuery("");
                        setSupportResults([]);
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-secondary"
                    >
                      {b.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Rows */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Shows ({rows.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {rows.map((r, i) => (
            <div
              key={i}
              className="border border-border/60 rounded-sm p-3 space-y-2"
            >
              <div className="flex justify-between items-center">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Show {i + 1}
                </p>
                {rows.length > 1 && (
                  <button
                    onClick={() => setRows(rows.filter((_, j) => j !== i))}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="Remove"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  value={r.date}
                  onChange={(e) => {
                    const next = [...rows];
                    next[i] = { ...next[i], date: e.target.value };
                    setRows(next);
                  }}
                />
                <Input
                  placeholder="Venue slug (or fill below)"
                  value={r.venueSlug}
                  onChange={(e) => {
                    const next = [...rows];
                    next[i] = { ...next[i], venueSlug: e.target.value };
                    setRows(next);
                  }}
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Input
                  placeholder="Venue name"
                  value={r.venueName}
                  onChange={(e) => {
                    const next = [...rows];
                    next[i] = { ...next[i], venueName: e.target.value };
                    setRows(next);
                  }}
                />
                <Input
                  placeholder="City"
                  value={r.city}
                  onChange={(e) => {
                    const next = [...rows];
                    next[i] = { ...next[i], city: e.target.value };
                    setRows(next);
                  }}
                />
                <Input
                  placeholder="Country (BG)"
                  maxLength={2}
                  value={r.countryCode}
                  onChange={(e) => {
                    const next = [...rows];
                    next[i] = {
                      ...next[i],
                      countryCode: e.target.value.toUpperCase(),
                    };
                    setRows(next);
                  }}
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <select
                  value={r.ticketProvider}
                  onChange={(e) => {
                    const next = [...rows];
                    next[i] = {
                      ...next[i],
                      ticketProvider: e.target.value,
                    };
                    setRows(next);
                  }}
                  className="h-10 bg-background/60 border border-input rounded-sm px-3 text-xs uppercase tracking-widest"
                >
                  {PROVIDERS.map((p) => (
                    <option key={p} value={p}>
                      {p.toLowerCase()}
                    </option>
                  ))}
                </select>
                <Input
                  placeholder="Ticket URL (optional)"
                  value={r.ticketUrl}
                  onChange={(e) => {
                    const next = [...rows];
                    next[i] = { ...next[i], ticketUrl: e.target.value };
                    setRows(next);
                  }}
                />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Price"
                  value={r.pricePerHead}
                  onChange={(e) => {
                    const next = [...rows];
                    next[i] = { ...next[i], pricePerHead: e.target.value };
                    setRows(next);
                  }}
                />
              </div>
            </div>
          ))}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setRows([...rows, emptyRow()])}
          >
            <Plus className="h-3 w-3" /> Another show
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-end pt-3 border-t border-border/60">
        <Button
          variant="spike"
          onClick={submit}
          disabled={pending || !headliner}
        >
          {pending ? "Creating..." : `Create ${rows.length} show${rows.length === 1 ? "" : "s"}`}
        </Button>
      </div>
    </div>
  );
}
