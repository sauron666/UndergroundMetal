"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const CATEGORIES = [
  "GENERAL",
  "RECOMMENDATIONS",
  "GEAR",
  "LOCAL_SCENES",
  "FESTIVALS",
  "RELEASES",
  "META",
] as const;

export function NewThreadForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("GENERAL");

  const submit = () => {
    if (!title.trim() || !body.trim()) {
      toast.error("Title and body required");
      return;
    }
    startTransition(async () => {
      const res = await fetch("/api/forum/threads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, body, category }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(j.error ?? "Failed");
        return;
      }
      const j = await res.json();
      router.push(`/forum/${j.thread.slug}`);
    });
  };

  return (
    <div className="space-y-3">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        className="text-xl h-12"
        maxLength={200}
      />
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value as typeof category)}
        className="h-10 w-full bg-background/60 border border-input rounded-sm px-3 text-sm uppercase tracking-widest"
      >
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c.toLowerCase().replace("_", " ")}
          </option>
        ))}
      </select>
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="What's on your mind?"
        rows={10}
        maxLength={20_000}
      />
      <div className="flex justify-end">
        <Button variant="spike" onClick={submit} disabled={pending}>
          {pending ? "Posting..." : "Post"}
        </Button>
      </div>
    </div>
  );
}
