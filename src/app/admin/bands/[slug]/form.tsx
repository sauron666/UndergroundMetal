"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { BandStatus } from "@prisma/client";

interface BandData {
  id: string;
  name: string;
  countryCode: string | null;
  city: string | null;
  formedYear: number | null;
  endedYear: number | null;
  status: BandStatus;
  undergroundScore: number;
  heaviness: number;
  bio: string | null;
  themes: string[];
  verified: boolean;
  genreIds: string[];
}

const STATUSES: BandStatus[] = ["ACTIVE", "ON_HOLD", "SPLIT_UP", "CHANGED_NAME", "UNKNOWN"];

export function BandEditForm({
  band,
  genres,
}: {
  band: BandData;
  genres: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [data, setData] = useState({
    ...band,
    themesStr: band.themes.join(", "),
  });

  const set = <K extends keyof typeof data>(key: K, value: (typeof data)[K]) =>
    setData((d) => ({ ...d, [key]: value }));

  const submit = () => {
    startTransition(async () => {
      const res = await fetch(`/api/admin/bands/${band.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          countryCode: data.countryCode,
          city: data.city,
          formedYear: data.formedYear,
          endedYear: data.endedYear,
          status: data.status,
          undergroundScore: data.undergroundScore,
          heaviness: data.heaviness,
          bio: data.bio,
          themes: data.themesStr
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          verified: data.verified,
          genreIds: data.genreIds,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(j.error ?? "Save failed");
        return;
      }
      toast.success("Saved");
      router.refresh();
    });
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <Field label="Name">
        <Input value={data.name} onChange={(e) => set("name", e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Country (ISO 2)">
          <Input
            value={data.countryCode ?? ""}
            maxLength={2}
            onChange={(e) =>
              set("countryCode", e.target.value.toUpperCase() || null)
            }
          />
        </Field>
        <Field label="City">
          <Input
            value={data.city ?? ""}
            onChange={(e) => set("city", e.target.value || null)}
          />
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Formed">
          <Input
            type="number"
            value={data.formedYear ?? ""}
            onChange={(e) =>
              set("formedYear", e.target.value ? Number(e.target.value) : null)
            }
          />
        </Field>
        <Field label="Ended">
          <Input
            type="number"
            value={data.endedYear ?? ""}
            onChange={(e) =>
              set("endedYear", e.target.value ? Number(e.target.value) : null)
            }
          />
        </Field>
        <Field label="Status">
          <select
            className="h-10 w-full bg-background/60 border border-input rounded-sm px-3 text-sm uppercase tracking-widest"
            value={data.status}
            onChange={(e) => set("status", e.target.value as BandStatus)}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label={`Heaviness ${data.heaviness}/10`}>
          <input
            type="range"
            min={1}
            max={10}
            value={data.heaviness}
            onChange={(e) => set("heaviness", Number(e.target.value))}
            className="w-full accent-primary"
          />
        </Field>
        <Field label={`Underground ${data.undergroundScore}/10`}>
          <input
            type="range"
            min={1}
            max={10}
            value={data.undergroundScore}
            onChange={(e) => set("undergroundScore", Number(e.target.value))}
            className="w-full accent-primary"
          />
        </Field>
      </div>
      <Field label="Themes (comma-separated)">
        <Input
          value={data.themesStr}
          onChange={(e) => set("themesStr", e.target.value)}
          placeholder="war, occult, nature"
        />
      </Field>
      <Field label="Bio">
        <Textarea
          rows={6}
          value={data.bio ?? ""}
          onChange={(e) => set("bio", e.target.value || null)}
        />
      </Field>
      <Field label="Genres">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {genres.map((g) => {
            const checked = data.genreIds.includes(g.id);
            return (
              <label
                key={g.id}
                className="flex items-center gap-2 text-xs cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    if (e.target.checked)
                      set("genreIds", [...data.genreIds, g.id]);
                    else set("genreIds", data.genreIds.filter((id) => id !== g.id));
                  }}
                  className="accent-primary"
                />
                <span>{g.name}</span>
              </label>
            );
          })}
        </div>
      </Field>
      <Field label="">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={data.verified}
            onChange={(e) => set("verified", e.target.checked)}
            className="accent-primary"
          />
          <span>Verified by editor</span>
        </label>
      </Field>

      <div className="flex justify-end gap-2 pt-4 border-t border-border/60">
        <Button variant="spike" onClick={submit} disabled={pending}>
          {pending ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      {label && (
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">
          {label}
        </span>
      )}
      {children}
    </label>
  );
}
