"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const SAMPLE = `name,startDate,endDate,city,countryCode,venueName,websiteUrl,undergroundScore,status,ticketProvider,ticketUrl,priceMinor,currency,passType,bandSlugs
Brutal Assault 2026,2026-08-12,2026-08-15,Jaroměř,CZ,Fortress Josefov,https://brutalassault.cz,5,ANNOUNCED,DIRECT,https://brutalassault.cz/tickets,17500,EUR,4-day pass,mayhem;darkthrone
MetalDays 2026,2026-07-26,2026-08-01,Tolmin,SI,Sotočje,https://metaldays.net,5,ANNOUNCED,DIRECT,https://metaldays.net/tickets,19900,EUR,Festival pass,emperor`;

export function CsvForm() {
  const router = useRouter();
  const [csv, setCsv] = useState(SAMPLE);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<null | {
    created: number;
    updated: number;
    skippedBands: string[];
    errors: string[];
  }>(null);

  const submit = () => {
    startTransition(async () => {
      const res = await fetch("/api/admin/festivals/csv", {
        method: "POST",
        headers: { "content-type": "text/csv" },
        body: csv,
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
        value={csv}
        onChange={(e) => setCsv(e.target.value)}
        rows={18}
        className="font-mono text-xs"
      />
      <div className="flex justify-end">
        <Button variant="spike" onClick={submit} disabled={pending}>
          {pending ? "Importing..." : "Import"}
        </Button>
      </div>
      {result && (
        <div className="border border-border rounded-sm p-3 text-xs font-mono space-y-1">
          <p>created: {result.created}</p>
          <p>updated: {result.updated}</p>
          {result.errors.length > 0 && (
            <>
              <p className="text-destructive">errors:</p>
              <ul className="list-disc list-inside">
                {result.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </>
          )}
          {result.skippedBands.length > 0 && (
            <>
              <p>skipped band slugs:</p>
              <ul className="list-disc list-inside text-muted-foreground">
                {result.skippedBands.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
