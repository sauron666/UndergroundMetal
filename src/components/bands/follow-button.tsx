"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart, HeartCrack } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function FollowButton({
  bandId,
  initialFollowing,
  initialCount,
  signedIn,
  followLabel = "Follow",
  unfollowLabel = "Following",
}: {
  bandId: string;
  initialFollowing: boolean;
  initialCount: number;
  signedIn: boolean;
  followLabel?: string;
  unfollowLabel?: string;
}) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [count, setCount] = useState(initialCount);
  const [pending, startTransition] = useTransition();

  const toggle = () => {
    if (!signedIn) {
      toast.error("Sign in to follow bands");
      router.push("/auth/signin");
      return;
    }
    const next = !following;
    setFollowing(next);
    setCount((c) => c + (next ? 1 : -1));
    startTransition(async () => {
      const res = await fetch("/api/follows", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ bandId, follow: next }),
      });
      if (!res.ok) {
        setFollowing(!next);
        setCount((c) => c + (next ? -1 : 1));
        toast.error("Failed");
        return;
      }
      const j = await res.json();
      setCount(j.count);
    });
  };

  return (
    <Button
      type="button"
      variant={following ? "secondary" : "outline"}
      size="sm"
      disabled={pending}
      onClick={toggle}
    >
      {following ? (
        <>
          <HeartCrack className="h-3.5 w-3.5" /> {unfollowLabel}
          <span className="ml-1 text-[10px] text-muted-foreground">{count}</span>
        </>
      ) : (
        <>
          <Heart className="h-3.5 w-3.5" /> {followLabel}
          <span className="ml-1 text-[10px] text-muted-foreground">{count}</span>
        </>
      )}
    </Button>
  );
}
