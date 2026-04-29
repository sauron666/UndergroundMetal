"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export function PasswordForm() {
  const [pending, startTransition] = useTransition();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (next !== confirm) {
          toast.error("Passwords don't match");
          return;
        }
        startTransition(async () => {
          const res = await fetch("/api/account/password", {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ current, next }),
          });
          if (!res.ok) {
            const j = await res.json().catch(() => ({}));
            toast.error(j.error ?? "Failed");
            return;
          }
          toast.success("Password changed");
          setCurrent("");
          setNext("");
          setConfirm("");
        });
      }}
      className="space-y-3"
    >
      <Input
        type="password"
        value={current}
        onChange={(e) => setCurrent(e.target.value)}
        placeholder="Current password"
        autoComplete="current-password"
      />
      <Input
        type="password"
        value={next}
        onChange={(e) => setNext(e.target.value)}
        placeholder="New password"
        minLength={8}
        autoComplete="new-password"
      />
      <Input
        type="password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder="Confirm new password"
        minLength={8}
        autoComplete="new-password"
      />
      <Button
        type="submit"
        variant="outline"
        disabled={pending || !current || !next}
      >
        {pending ? "Saving..." : "Change password"}
      </Button>
    </form>
  );
}
