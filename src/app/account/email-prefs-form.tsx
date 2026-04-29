"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Prefs {
  weeklyDigest: boolean;
  newShowAlerts: boolean;
  newArticleAlerts: boolean;
  productUpdates: boolean;
}

const FIELDS: { key: keyof Prefs; label: string; description: string }[] = [
  {
    key: "weeklyDigest",
    label: "Weekly digest",
    description: "Sunday recap of new articles and shows for bands you follow.",
  },
  {
    key: "newShowAlerts",
    label: "New show alerts",
    description: "Email immediately when a show is announced for a followed band.",
  },
  {
    key: "newArticleAlerts",
    label: "New article alerts",
    description: "Email when a review or feature about a followed band is published.",
  },
  {
    key: "productUpdates",
    label: "Product updates",
    description: "Occasional emails about platform features. Off by default.",
  },
];

export function EmailPrefsForm({ prefs }: { prefs: Prefs }) {
  const [data, setData] = useState(prefs);
  const [pending, startTransition] = useTransition();

  const save = (next: Prefs) => {
    setData(next);
    startTransition(async () => {
      const res = await fetch("/api/account/email-prefs", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(next),
      });
      if (!res.ok) {
        toast.error("Save failed");
        setData(prefs);
        return;
      }
      toast.success("Updated");
    });
  };

  return (
    <div className="space-y-3">
      {FIELDS.map((f) => (
        <label key={f.key} className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={data[f.key]}
            onChange={(e) => save({ ...data, [f.key]: e.target.checked })}
            disabled={pending}
            className="accent-primary mt-1"
          />
          <div>
            <p className="text-sm font-medium">{f.label}</p>
            <p className="text-xs text-muted-foreground">{f.description}</p>
          </div>
        </label>
      ))}
      {pending && (
        <Button variant="ghost" size="sm" disabled>
          Saving...
        </Button>
      )}
    </div>
  );
}
