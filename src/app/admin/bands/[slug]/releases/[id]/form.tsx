"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/uploads/image-upload";
import { toast } from "sonner";
import type { ReleaseType } from "@prisma/client";

const TYPES: ReleaseType[] = [
  "FULL_LENGTH",
  "EP",
  "DEMO",
  "SPLIT",
  "COMPILATION",
  "LIVE",
  "SINGLE",
];

interface ReleaseData {
  id: string;
  title: string;
  type: ReleaseType;
  year: number | null;
  releaseDate: string | null;
  coverUrl: string | null;
  bandcampUrl: string | null;
  spotifyId: string | null;
  description: string | null;
  trackCount: number | null;
  durationSec: number | null;
}

export function ReleaseForm({ release }: { release: ReleaseData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [data, setData] = useState({
    title: release.title,
    type: release.type,
    year: release.year?.toString() ?? "",
    releaseDate: release.releaseDate ?? "",
    coverUrl: release.coverUrl,
    bandcampUrl: release.bandcampUrl ?? "",
    spotifyId: release.spotifyId ?? "",
    description: release.description ?? "",
    trackCount: release.trackCount?.toString() ?? "",
    durationSec: release.durationSec?.toString() ?? "",
  });

  const submit = () => {
    startTransition(async () => {
      const res = await fetch(`/api/admin/releases/${release.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: data.title,
          type: data.type,
          year: data.year ? Number(data.year) : null,
          releaseDate: data.releaseDate
            ? new Date(data.releaseDate).toISOString()
            : null,
          coverUrl: data.coverUrl,
          bandcampUrl: data.bandcampUrl || null,
          spotifyId: data.spotifyId || null,
          description: data.description || null,
          trackCount: data.trackCount ? Number(data.trackCount) : null,
          durationSec: data.durationSec ? Number(data.durationSec) : null,
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
      <ImageUpload
        scope="band"
        ownerId={release.id}
        value={data.coverUrl}
        onChange={(url) => setData({ ...data, coverUrl: url })}
        label="Cover"
        aspect="square"
      />
      <Field label="Title">
        <Input
          value={data.title}
          onChange={(e) => setData({ ...data, title: e.target.value })}
        />
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Type">
          <select
            value={data.type}
            onChange={(e) =>
              setData({ ...data, type: e.target.value as ReleaseType })
            }
            className="h-10 w-full bg-background/60 border border-input rounded-sm px-3 text-sm uppercase tracking-widest"
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace("_", " ")}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Year">
          <Input
            type="number"
            value={data.year}
            onChange={(e) => setData({ ...data, year: e.target.value })}
          />
        </Field>
        <Field label="Release date">
          <Input
            type="date"
            value={data.releaseDate}
            onChange={(e) => setData({ ...data, releaseDate: e.target.value })}
          />
        </Field>
      </div>
      <Field label="Bandcamp URL (use the embed URL for inline player)">
        <Input
          value={data.bandcampUrl}
          onChange={(e) => setData({ ...data, bandcampUrl: e.target.value })}
          placeholder="https://bandcamp.com/EmbeddedPlayer/album=123456789/..."
        />
      </Field>
      <Field label="Spotify album ID">
        <Input
          value={data.spotifyId}
          onChange={(e) => setData({ ...data, spotifyId: e.target.value })}
          placeholder="e.g. 5lDriBxJd22I0zntsuPLgI"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Track count">
          <Input
            type="number"
            value={data.trackCount}
            onChange={(e) => setData({ ...data, trackCount: e.target.value })}
            min={0}
          />
        </Field>
        <Field label="Duration (seconds)">
          <Input
            type="number"
            value={data.durationSec}
            onChange={(e) => setData({ ...data, durationSec: e.target.value })}
            min={0}
          />
        </Field>
      </div>
      <Field label="Description">
        <Textarea
          rows={5}
          value={data.description}
          onChange={(e) => setData({ ...data, description: e.target.value })}
        />
      </Field>
      <div className="flex justify-end pt-4 border-t border-border/60">
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
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">
        {label}
      </span>
      {children}
    </label>
  );
}
