"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function MessageButton({ username }: { username: string | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (!username) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const res = await fetch("/api/messages/threads", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ username }),
          });
          if (!res.ok) {
            const j = await res.json().catch(() => ({}));
            toast.error(j.error ?? "Failed");
            return;
          }
          const j = await res.json();
          router.push(`/messages/${j.threadId}`);
        });
      }}
    >
      <Mail className="h-3.5 w-3.5" /> Message
    </Button>
  );
}
