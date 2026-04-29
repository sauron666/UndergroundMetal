"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Report {
  id: string;
  target: string;
  targetId: string;
  reason: string;
  createdAt: string;
  reporter: string;
}

export function ReportsList({ initial }: { initial: Report[] }) {
  const [items, setItems] = useState(initial);
  const [pending, startTransition] = useTransition();

  const resolve = (id: string, status: "RESOLVED" | "REJECTED") => {
    startTransition(async () => {
      const res = await fetch(`/api/reports/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        toast.error("Failed");
        return;
      }
      setItems((prev) => prev.filter((r) => r.id !== id));
      toast.success(status.toLowerCase());
    });
  };

  if (items.length === 0) {
    return (
      <p className="text-center text-muted-foreground italic py-12">
        No open reports.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((r) => (
        <Card key={r.id}>
          <CardContent className="py-4 flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline">{r.target.toLowerCase()}</Badge>
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
                  {r.targetId.slice(0, 12)}
                </span>
                <span className="text-[10px] text-muted-foreground ml-auto">
                  by {r.reporter} ·{" "}
                  {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}
                </span>
              </div>
              <p className="text-sm">{r.reason}</p>
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => resolve(r.id, "RESOLVED")}
                disabled={pending}
              >
                Resolve
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => resolve(r.id, "REJECTED")}
                disabled={pending}
              >
                Reject
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
