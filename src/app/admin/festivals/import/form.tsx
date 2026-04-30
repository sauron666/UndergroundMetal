"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const SAMPLE = JSON.stringify(
  [
    {
      slug: "metaldays-2026",
      name: "MetalDays 2026",
      startDate: "2026-07-26",
      endDate: "2026-08-01",
      city: "Tolmin",
      countryCode: "SI",
      venueName: "Sotočje",
      websiteUrl: "https://www.metaldays.net",
      status: "ANNOUNCED",
      undergroundScore: 5,
      bands: [
        { slug: "mayhem", position: 0, day: 1 },
        { slug: "darkthrone", position: 1, day: 2 },
      ],
      tickets: [
        { provider: "DIRECT", url: "https://...", passType: "Festival pass", priceMinor: 19900, currency: "EUR" },
      ],
    },
  ],
  null,
  2
);

export function ImportForm() {
  const router = useRouter();
  const [json, setJson] = useState(SAMPLE);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<null | {
    created: number;
    updated: number;
    skippedBands: string[];
  }>(null);

  const submit = () => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch (e) {
      toast.error("Invalid JSON");
      return;
    }
    if (!Array.isArray(parsed)) {
      toast.error("Top level must be an array");
      return;
    }
    startTransition(async () => {
      const res = await fetch("/api/admin/festivals/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ festivals: parsed }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(j.error ?? "Failed");
        return;
      }
      const j = await res.json();
      setResult(j);
      toast.success(`${j.created + j.updated} festivals imported`);
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <Textarea
        value={json}
        onChange={(e) => setJson(e.target.value)}
        rows={20}
        className="font-mono text-xs"
      />
      <div className="flex justify-end">
        <Button variant="spike" onClick={submit} disabled={pending}>
          {pending ? "Importing..." : "Import"}
        </Button>
      </div>
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Result</CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-1 font-mono">
            <p>created: {result.created}</p>
            <p>updated: {result.updated}</p>
            {result.skippedBands.length > 0 && (
              <>
                <p>skipped band slugs (not in catalogue):</p>
                <ul className="list-disc list-inside text-muted-foreground">
                  {result.skippedBands.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
