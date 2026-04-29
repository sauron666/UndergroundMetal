"use client";

import { useState, useTransition } from "react";
import { Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function NewsletterSignup({ source }: { source?: string }) {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  if (done) {
    return (
      <p className="text-sm text-primary inline-flex items-center gap-2">
        <Mail className="h-4 w-4" /> Check your inbox to confirm.
      </p>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!email) return;
        startTransition(async () => {
          const res = await fetch("/api/newsletter/subscribe", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ email, source }),
          });
          if (!res.ok) {
            const j = await res.json().catch(() => ({}));
            toast.error(j.error ?? "Failed");
            return;
          }
          const j = await res.json();
          if (j.status === "already-subscribed") {
            toast.success("You're already subscribed.");
          } else {
            setDone(true);
            toast.success("Confirmation sent.");
          }
        });
      }}
      className="flex flex-col sm:flex-row gap-2 max-w-md"
    >
      <Input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        required
        autoComplete="email"
      />
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "Sending..." : "Subscribe"}
      </Button>
    </form>
  );
}
