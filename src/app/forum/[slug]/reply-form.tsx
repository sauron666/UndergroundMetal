"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export function ReplyForm({ threadId }: { threadId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!body.trim()) return;
        startTransition(async () => {
          const res = await fetch(`/api/forum/threads/${threadId}/posts`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ body }),
          });
          if (!res.ok) {
            const j = await res.json().catch(() => ({}));
            toast.error(j.error ?? "Failed");
            return;
          }
          setBody("");
          router.refresh();
        });
      }}
      className="space-y-2"
    >
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Reply..."
        rows={4}
        maxLength={20_000}
      />
      <div className="flex justify-end">
        <Button type="submit" variant="spike" size="sm" disabled={pending || !body.trim()}>
          {pending ? "Posting..." : "Reply"}
        </Button>
      </div>
    </form>
  );
}
