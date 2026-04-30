"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export function BestOfButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(new Date().getUTCFullYear().toString());
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Sparkles className="h-3.5 w-3.5" /> AI best-of
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        value={year}
        onChange={(e) => setYear(e.target.value)}
        placeholder="Year"
        min={1970}
        max={2200}
        className="w-24"
      />
      <Button
        variant="spike"
        size="sm"
        disabled={pending || !year}
        onClick={() => {
          startTransition(async () => {
            const res = await fetch("/api/admin/lists/best-of", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ year: Number(year), limit: 25 }),
            });
            if (!res.ok) {
              const j = await res.json().catch(() => ({}));
              toast.error(j.error ?? "Failed");
              return;
            }
            const j = await res.json();
            toast.success(`${j.picks} picks generated`);
            router.push(`/admin/lists/${j.slug}`);
          });
        }}
      >
        {pending ? "Conjuring..." : "Generate"}
      </Button>
      <button
        onClick={() => setOpen(false)}
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        cancel
      </button>
    </div>
  );
}
