"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/uploads/image-upload";
import { toast } from "sonner";

interface SeriesData {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
}

export function SeriesForm({ series }: { series: SeriesData | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [data, setData] = useState({
    title: series?.title ?? "",
    description: series?.description ?? "",
    coverUrl: series?.coverUrl ?? null,
  });

  const submit = () => {
    startTransition(async () => {
      const url = series
        ? `/api/admin/series/${series.id}`
        : "/api/admin/series";
      const res = await fetch(url, {
        method: series ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: data.title,
          description: data.description || null,
          coverUrl: data.coverUrl,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(j.error ?? "Save failed");
        return;
      }
      const j = await res.json();
      toast.success("Saved");
      if (!series) router.push(`/admin/series/${j.series.slug}`);
      else router.refresh();
    });
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <ImageUpload
        scope="article"
        ownerId={series?.id ?? "new-series"}
        value={data.coverUrl}
        onChange={(url) => setData({ ...data, coverUrl: url })}
        label="Cover"
        aspect="wide"
      />
      <Field label="Title">
        <Input
          value={data.title}
          onChange={(e) => setData({ ...data, title: e.target.value })}
        />
      </Field>
      <Field label="Description">
        <Textarea
          rows={5}
          value={data.description}
          onChange={(e) => setData({ ...data, description: e.target.value })}
        />
      </Field>
      <div className="flex justify-end pt-4 border-t border-border/60">
        <Button variant="spike" onClick={submit} disabled={pending}>
          {pending ? "Saving..." : series ? "Save" : "Create"}
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
