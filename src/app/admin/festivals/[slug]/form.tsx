"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/uploads/image-upload";
import { toast } from "sonner";
import type { FestivalStatus } from "@prisma/client";

interface FestivalData {
  id: string;
  name: string;
  slug: string;
  startDate: string;
  endDate: string;
  city: string;
  countryCode: string;
  venueName: string | null;
  websiteUrl: string | null;
  posterUrl: string | null;
  description: string | null;
  status: FestivalStatus;
  undergroundScore: number;
  verified: boolean;
}

const STATUSES: FestivalStatus[] = [
  "ANNOUNCED",
  "CONFIRMED",
  "CANCELLED",
  "POSTPONED",
  "PAST",
];

export function FestivalForm({
  festival,
}: {
  festival: FestivalData | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [data, setData] = useState({
    name: festival?.name ?? "",
    startDate: festival?.startDate ?? "",
    endDate: festival?.endDate ?? "",
    city: festival?.city ?? "",
    countryCode: festival?.countryCode ?? "",
    venueName: festival?.venueName ?? "",
    websiteUrl: festival?.websiteUrl ?? "",
    posterUrl: festival?.posterUrl ?? null,
    description: festival?.description ?? "",
    status: festival?.status ?? ("ANNOUNCED" as FestivalStatus),
    undergroundScore: festival?.undergroundScore ?? 5,
    verified: festival?.verified ?? false,
  });

  const submit = () => {
    startTransition(async () => {
      const url = festival
        ? `/api/admin/festivals/${festival.id}`
        : "/api/admin/festivals";
      const res = await fetch(url, {
        method: festival ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          startDate: data.startDate,
          endDate: data.endDate,
          city: data.city,
          countryCode: data.countryCode.toUpperCase(),
          venueName: data.venueName || null,
          websiteUrl: data.websiteUrl || null,
          posterUrl: data.posterUrl,
          description: data.description || null,
          status: data.status,
          undergroundScore: data.undergroundScore,
          verified: data.verified,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(j.error ?? "Save failed");
        return;
      }
      const j = await res.json();
      toast.success("Saved");
      if (!festival) router.push(`/admin/festivals/${j.festival.slug}`);
      else router.refresh();
    });
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <ImageUpload
        scope="show"
        ownerId={festival?.id ?? "new"}
        value={data.posterUrl}
        onChange={(url) => setData({ ...data, posterUrl: url })}
        label="Poster"
        aspect="tall"
      />
      <Field label="Name">
        <Input
          value={data.name}
          onChange={(e) => setData({ ...data, name: e.target.value })}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Start">
          <Input
            type="date"
            value={data.startDate}
            onChange={(e) => setData({ ...data, startDate: e.target.value })}
          />
        </Field>
        <Field label="End">
          <Input
            type="date"
            value={data.endDate}
            onChange={(e) => setData({ ...data, endDate: e.target.value })}
          />
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="City">
          <Input
            value={data.city}
            onChange={(e) => setData({ ...data, city: e.target.value })}
          />
        </Field>
        <Field label="Country (ISO 2)">
          <Input
            value={data.countryCode}
            maxLength={2}
            onChange={(e) =>
              setData({ ...data, countryCode: e.target.value.toUpperCase() })
            }
          />
        </Field>
        <Field label="Venue">
          <Input
            value={data.venueName}
            onChange={(e) => setData({ ...data, venueName: e.target.value })}
          />
        </Field>
      </div>
      <Field label="Website">
        <Input
          value={data.websiteUrl}
          onChange={(e) => setData({ ...data, websiteUrl: e.target.value })}
          placeholder="https://..."
        />
      </Field>
      <Field label="Description">
        <Textarea
          rows={5}
          value={data.description}
          onChange={(e) => setData({ ...data, description: e.target.value })}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Status">
          <select
            value={data.status}
            onChange={(e) =>
              setData({ ...data, status: e.target.value as FestivalStatus })
            }
            className="h-10 w-full bg-background/60 border border-input rounded-sm px-3 text-sm uppercase tracking-widest"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <Field label={`Underground ${data.undergroundScore}/10`}>
          <input
            type="range"
            min={1}
            max={10}
            value={data.undergroundScore}
            onChange={(e) =>
              setData({ ...data, undergroundScore: Number(e.target.value) })
            }
            className="w-full accent-primary"
          />
        </Field>
      </div>
      <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={data.verified}
          onChange={(e) => setData({ ...data, verified: e.target.checked })}
          className="accent-primary"
        />
        <span>Verified by editor</span>
      </label>
      <div className="flex justify-end pt-4 border-t border-border/60">
        <Button variant="spike" onClick={submit} disabled={pending}>
          {pending ? "Saving..." : festival ? "Save" : "Create"}
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
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">
        {label}
      </span>
      {children}
    </label>
  );
}
