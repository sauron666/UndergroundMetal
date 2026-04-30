"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

export function ApplyForm({ reapply }: { reapply?: boolean }) {
  const router = useRouter();
  const [pitch, setPitch] = useState("");
  const [samples, setSamples] = useState<string[]>([""]);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    if (pitch.trim().length < 200) {
      toast.error("Tell us a bit more — at least 200 characters.");
      return;
    }
    const cleanSamples = samples.map((s) => s.trim()).filter(Boolean);
    startTransition(async () => {
      const res = await fetch("/api/account/author-application", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pitch, samples: cleanSamples }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(j.error ?? "Failed");
        return;
      }
      toast.success("Application submitted");
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      {reapply && (
        <p className="text-xs text-muted-foreground border-l-2 border-primary/40 pl-3">
          You can re-apply. Address the editor&apos;s feedback above.
        </p>
      )}
      <Textarea
        value={pitch}
        onChange={(e) => setPitch(e.target.value)}
        placeholder="200-2000 chars. What do you want to cover, why are you the right person, what's your angle?"
        rows={8}
        maxLength={2000}
      />
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground -mt-2">
        {pitch.length} / 2000
      </p>

      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Sample links (optional)
        </p>
        {samples.map((s, i) => (
          <div key={i} className="flex gap-2">
            <Input
              value={s}
              onChange={(e) => {
                const next = [...samples];
                next[i] = e.target.value;
                setSamples(next);
              }}
              placeholder="https://..."
              type="url"
            />
            {samples.length > 1 && (
              <button
                onClick={() => setSamples(samples.filter((_, j) => j !== i))}
                className="text-muted-foreground hover:text-destructive px-2"
                aria-label="Remove"
                type="button"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
        {samples.length < 6 && (
          <button
            type="button"
            onClick={() => setSamples([...samples, ""])}
            className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-primary"
          >
            <Plus className="h-3 w-3" /> Another link
          </button>
        )}
      </div>

      <div className="flex justify-end pt-3 border-t border-border/60">
        <Button variant="spike" onClick={submit} disabled={pending}>
          {pending ? "Submitting..." : "Submit application"}
        </Button>
      </div>
    </div>
  );
}
