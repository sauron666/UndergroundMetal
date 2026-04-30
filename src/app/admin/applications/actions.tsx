"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export function ApplicationActions({
  applicationId,
}: {
  applicationId: string;
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  const decide = (decision: "approve" | "reject") => {
    startTransition(async () => {
      const res = await fetch(`/api/admin/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision, note: note || undefined }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(j.error ?? "Failed");
        return;
      }
      toast.success(decision === "approve" ? "Approved" : "Rejected");
      router.refresh();
    });
  };

  return (
    <div className="space-y-2 pt-3 border-t border-border/60">
      <Textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Decision note (optional, sent to applicant)"
        rows={2}
        maxLength={2000}
      />
      <div className="flex gap-2 justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => decide("reject")}
          disabled={pending}
        >
          Reject
        </Button>
        <Button
          variant="spike"
          size="sm"
          onClick={() => decide("approve")}
          disabled={pending}
        >
          Approve & promote
        </Button>
      </div>
    </div>
  );
}
