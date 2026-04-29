"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/uploads/image-upload";
import { toast } from "sonner";
import type { ListKind } from "@prisma/client";

interface ListData {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  kind: ListKind;
  year: number | null;
  published: boolean;
  coverUrl: string | null;
}

const KINDS: ListKind[] = ["BEST_OF", "PRIMER", "STAFF_PICK"];

export function ListForm({ list }: { list: ListData | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [data, setData] = useState({
    title: list?.title ?? "",
    description: list?.description ?? "",
    kind: list?.kind ?? ("STAFF_PICK" as ListKind),
    year: list?.year?.toString() ?? "",
    published: list?.published ?? false,
    coverUrl: list?.coverUrl ?? null,
  });

  const submit = () => {
    startTransition(async () => {
      const url = list ? `/api/admin/lists/${list.id}` : "/api/admin/lists";
      const res = await fetch(url, {
        method: list ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: data.title,
          description: data.description || null,
          kind: data.kind,
          year: data.year ? Number(data.year) : null,
          published: data.published,
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
      if (!list) router.push(`/admin/lists/${j.list.slug}`);
      else router.refresh();
    });
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <ImageUpload
        scope="article"
        ownerId={list?.id ?? "new-list"}
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
      <div className="grid grid-cols-2 gap-3">
        <Field label="Kind">
          <select
            value={data.kind}
            onChange={(e) =>
              setData({ ...data, kind: e.target.value as ListKind })
            }
            className="h-10 w-full bg-background/60 border border-input rounded-sm px-3 text-sm uppercase tracking-widest"
          >
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {k.replace("_", " ")}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Year">
          <Input
            type="number"
            value={data.year}
            onChange={(e) => setData({ ...data, year: e.target.value })}
            placeholder="e.g. 2025"
          />
        </Field>
      </div>
      <Field label="Description">
        <Textarea
          rows={5}
          value={data.description}
          onChange={(e) => setData({ ...data, description: e.target.value })}
          placeholder="A line or two introducing the list..."
        />
      </Field>
      <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={data.published}
          onChange={(e) => setData({ ...data, published: e.target.checked })}
          className="accent-primary"
        />
        <span>Published</span>
      </label>
      <div className="flex justify-end pt-4 border-t border-border/60">
        <Button variant="spike" onClick={submit} disabled={pending}>
          {pending ? "Saving..." : list ? "Save" : "Create"}
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
