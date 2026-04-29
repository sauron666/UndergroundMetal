"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function MarkAllRead() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await fetch("/api/notifications", {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ all: true }),
          });
          router.refresh();
        });
      }}
    >
      Mark all read
    </Button>
  );
}
