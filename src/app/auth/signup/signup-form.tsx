"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export function SignUpForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const res = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ email, username, password }),
          });
          if (!res.ok) {
            const j = await res.json().catch(() => ({}));
            toast.error(j.error ?? "Sign up failed");
            return;
          }
          await signIn("credentials", { email, password, redirect: false });
          toast.success("Welcome");
          router.push("/");
          router.refresh();
        });
      }}
      className="space-y-3"
    >
      <Input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        autoComplete="email"
      />
      <Input
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        pattern="[a-zA-Z0-9_-]{3,24}"
        title="3-24 chars · letters, numbers, _ and -"
        required
        autoComplete="username"
      />
      <Input
        type="password"
        placeholder="Password (8+ chars)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        minLength={8}
        required
        autoComplete="new-password"
      />
      <Button type="submit" variant="spike" className="w-full" disabled={pending}>
        {pending ? "Carving..." : "Create account"}
      </Button>
    </form>
  );
}
