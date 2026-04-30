"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Prefs {
  weeklyDigest: boolean;
  newShowAlerts: boolean;
  newArticleAlerts: boolean;
  productUpdates: boolean;
  inAppShowAlerts: boolean;
  inAppArticleAlerts: boolean;
  inAppCommentReplies: boolean;
  inAppMentions: boolean;
}

interface Group {
  title: string;
  fields: { key: keyof Prefs; label: string; description: string }[];
}

const GROUPS: Group[] = [
  {
    title: "Email",
    fields: [
      {
        key: "weeklyDigest",
        label: "Weekly digest",
        description:
          "Sunday recap of new articles and shows for bands you follow.",
      },
      {
        key: "newShowAlerts",
        label: "New show alerts",
        description:
          "Email immediately when a show is announced for a followed band.",
      },
      {
        key: "newArticleAlerts",
        label: "New article alerts",
        description:
          "Email when a review or feature about a followed band is published.",
      },
      {
        key: "productUpdates",
        label: "Product updates",
        description: "Occasional emails about platform features. Off by default.",
      },
    ],
  },
  {
    title: "In-app inbox",
    fields: [
      {
        key: "inAppShowAlerts",
        label: "Show announcements",
        description: "Inbox notifications for shows of bands you follow.",
      },
      {
        key: "inAppArticleAlerts",
        label: "New articles",
        description:
          "Inbox notifications when articles cover a band you follow.",
      },
      {
        key: "inAppCommentReplies",
        label: "Replies",
        description: "Inbox notifications when someone replies to your comment.",
      },
      {
        key: "inAppMentions",
        label: "Mentions",
        description: "Inbox notifications when someone @-mentions you.",
      },
    ],
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
    <div className="space-y-6">
      {GROUPS.map((g) => (
        <div key={g.title}>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
            {g.title}
          </p>
          <div className="space-y-3">
            {g.fields.map((f) => (
              <label
                key={f.key}
                className="flex items-start gap-3 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={data[f.key]}
                  onChange={(e) =>
                    save({ ...data, [f.key]: e.target.checked })
                  }
                  disabled={pending}
                  className="accent-primary mt-1"
                />
                <div>
                  <p className="text-sm font-medium">{f.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {f.description}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>
      ))}
      {pending && (
        <Button variant="ghost" size="sm" disabled>
          Saving...
        </Button>
      )}
    </div>
  );
}
