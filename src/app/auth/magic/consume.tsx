"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { toast } from "sonner";

export function MagicConsume({ token }: { token: string | null }) {
  const router = useRouter();
  const sent = useRef(false);

  useEffect(() => {
    if (!token || sent.current) return;
    sent.current = true;
    (async () => {
      const res = await signIn("magic", { token, redirect: false });
      if (res?.error) {
        toast.error("This link is invalid or has expired.");
        router.replace("/auth/signin?err=magic");
        return;
      }
      router.replace("/");
      router.refresh();
    })();
  }, [token, router]);

  return null;
}
