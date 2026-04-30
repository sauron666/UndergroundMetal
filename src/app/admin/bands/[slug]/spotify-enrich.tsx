"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function SpotifyEnrichButton({ bandId }: { bandId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const res = await fetch(
            `/api/admin/bands/${bandId}/spotify`,
            { method: "POST" }
          );
          if (!res.ok) {
            const j = await res.json().catch(() => ({}));
            toast.error(j.error ?? "Failed");
            return;
          }
          const j = await res.json();
          toast.success(
            `Spotify: +${j.createdReleases} releases · ${j.genres.length} genre tags`
          );
          router.refresh();
        });
      }}
    >
      {pending ? "Enriching..." : "Enrich from Spotify"}
    </Button>
  );
}
