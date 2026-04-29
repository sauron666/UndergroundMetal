"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowBigUp, ArrowBigDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function VoteBar({
  articleId,
  initialUp,
  initialDown,
  initialMine,
  signedIn,
}: {
  articleId: string;
  initialUp: number;
  initialDown: number;
  initialMine: "UP" | "DOWN" | null;
  signedIn: boolean;
}) {
  const router = useRouter();
  const [up, setUp] = useState(initialUp);
  const [down, setDown] = useState(initialDown);
  const [mine, setMine] = useState<"UP" | "DOWN" | null>(initialMine);
  const [pending, startTransition] = useTransition();

  const cast = (next: "UP" | "DOWN") => {
    if (!signedIn) {
      toast.error("Sign in to vote");
      router.push("/auth/signin");
      return;
    }
    const value = mine === next ? null : next;
    // Optimistic
    const prev = { up, down, mine };
    let nu = up;
    let nd = down;
    if (mine === "UP") nu -= 1;
    if (mine === "DOWN") nd -= 1;
    if (value === "UP") nu += 1;
    if (value === "DOWN") nd += 1;
    setUp(nu);
    setDown(nd);
    setMine(value);

    startTransition(async () => {
      const res = await fetch("/api/votes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ articleId, value }),
      });
      if (!res.ok) {
        setUp(prev.up);
        setDown(prev.down);
        setMine(prev.mine);
        toast.error("Vote failed");
        return;
      }
      const j = await res.json();
      setUp(j.up);
      setDown(j.down);
      setMine(j.mine);
    });
  };

  const score = up - down;

  return (
    <div className="flex items-center gap-1 border border-border rounded-sm overflow-hidden">
      <button
        onClick={() => cast("UP")}
        disabled={pending}
        className={cn(
          "p-2 hover:bg-secondary transition-colors",
          mine === "UP" && "text-primary bg-primary/10"
        )}
        aria-label="Upvote"
      >
        <ArrowBigUp className="h-4 w-4" />
      </button>
      <span
        className={cn(
          "px-2 text-xs font-mono tabular-nums min-w-[2rem] text-center",
          score > 0 && "text-primary",
          score < 0 && "text-muted-foreground"
        )}
      >
        {score >= 0 ? `+${score}` : score}
      </span>
      <button
        onClick={() => cast("DOWN")}
        disabled={pending}
        className={cn(
          "p-2 hover:bg-secondary transition-colors",
          mine === "DOWN" && "text-destructive bg-destructive/10"
        )}
        aria-label="Downvote"
      >
        <ArrowBigDown className="h-4 w-4" />
      </button>
    </div>
  );
}
