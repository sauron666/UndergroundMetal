"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Github } from "lucide-react";

export function SignInForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => {
            const res = await signIn("credentials", {
              email,
              password,
              redirect: false,
            });
            if (res?.error) {
              toast.error("Invalid credentials");
            } else {
              router.push("/");
              router.refresh();
            }
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
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          minLength={8}
        />
        <Button
          type="submit"
          variant="spike"
          className="w-full"
          disabled={pending}
        >
          {pending ? "Summoning..." : "Sign in"}
        </Button>
      </form>

      <div className="divider-cross text-[10px] uppercase tracking-widest">
        or
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => signIn("github")}
      >
        <Github className="h-4 w-4" /> Continue with GitHub
      </Button>
    </div>
  );
}
