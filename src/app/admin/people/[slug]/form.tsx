"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface PersonData {
  id: string;
  name: string;
  bornYear: number | null;
  countryCode: string | null;
  bio: string | null;
}

export function PersonForm({ person }: { person: PersonData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [data, setData] = useState({
    name: person.name,
    bornYear: person.bornYear?.toString() ?? "",
    countryCode: person.countryCode ?? "",
    bio: person.bio ?? "",
  });

  const submit = () => {
    startTransition(async () => {
      const res = await fetch(`/api/admin/persons/${person.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          bornYear: data.bornYear ? Number(data.bornYear) : null,
          countryCode: data.countryCode
            ? data.countryCode.toUpperCase()
            : null,
          bio: data.bio || null,
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
        <Input
          value={data.name}
          onChange={(e) => setData({ ...data, name: e.target.value })}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Born year">
          <Input
            type="number"
            value={data.bornYear}
            onChange={(e) => setData({ ...data, bornYear: e.target.value })}
          />
        </Field>
        <Field label="Country (ISO 2)">
          <Input
            value={data.countryCode}
            maxLength={2}
            onChange={(e) =>
              setData({
                ...data,
                countryCode: e.target.value.toUpperCase(),
              })
            }
          />
        </Field>
      </div>
      <Field label="Bio">
        <Textarea
          rows={6}
          value={data.bio}
          onChange={(e) => setData({ ...data, bio: e.target.value })}
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
