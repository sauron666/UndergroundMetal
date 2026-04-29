"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function ReleaseRating({
  releaseId,
  avg,
  count,
  myValue,
  signedIn,
}: {
  releaseId: string;
  avg: number | null;
  count: number;
  myValue: number | null;
  signedIn: boolean;
}) {
  const router = useRouter();
  const [hover, setHover] = useState<number | null>(null);
  const [mine, setMine] = useState<number | null>(myValue);
  const [stats, setStats] = useState({ avg, count });
  const [pending, startTransition] = useTransition();

  const cast = (next: number) => {
    if (!signedIn) {
      toast.error("Sign in to rate");
      router.push("/auth/signin");
      return;
    }
    const value = mine === next ? null : next;
    setMine(value);
    startTransition(async () => {
      const res = await fetch(`/api/releases/${releaseId}/rating`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ value }),
      });
      if (!res.ok) {
        toast.error("Failed");
        setMine(myValue);
        return;
      }
      const j = await res.json();
      setStats({ avg: j.avg, count: j.count });
    });
  };

  const display = hover ?? mine ?? 0;

  return (
    <div className="flex items-center gap-3">
      <div
        className="inline-flex items-center"
        onMouseLeave={() => setHover(null)}
      >
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onMouseEnter={() => setHover(n)}
            onClick={() => cast(n)}
            disabled={pending}
            className={cn(
              "p-0.5",
              n <= display ? "text-primary" : "text-muted-foreground"
            )}
            aria-label={`Rate ${n} of 10`}
          >
            <Star className="h-4 w-4 fill-current" />
          </button>
        ))}
      </div>
      <div className="text-xs text-muted-foreground font-mono">
        {stats.avg != null ? (
          <>
            <span className="text-foreground">{stats.avg.toFixed(1)}</span>/10 ·{" "}
            {stats.count} {stats.count === 1 ? "vote" : "votes"}
          </>
        ) : (
          <span>no ratings yet</span>
        )}
      </div>
    </div>
  );
}
