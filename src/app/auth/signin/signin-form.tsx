"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Github, ShieldCheck } from "lucide-react";

type Step = "creds" | "totp";

export function SignInForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState<Step>("creds");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpToken, setTotpToken] = useState("");

  const finalSignIn = (token?: string) => {
    startTransition(async () => {
      const res = await signIn("credentials", {
        email,
        password,
        totpToken: token,
        redirect: false,
      });
      if (res?.error) {
        toast.error(token ? "Wrong code" : "Invalid credentials");
        return;
      }
      router.push("/");
      router.refresh();
    });
  };

  if (step === "totp") {
    return (
      <div className="space-y-3">
        <div className="text-sm flex items-center gap-2 text-primary">
          <ShieldCheck className="h-4 w-4" /> Two-factor required
        </div>
        <p className="text-xs text-muted-foreground">
          Enter the 6-digit code from your authenticator app, or a recovery
          code.
        </p>
        <Input
          value={totpToken}
          onChange={(e) => setTotpToken(e.target.value.toUpperCase())}
          placeholder="123 456 or XXXX-XXXX-XX"
          autoComplete="one-time-code"
          autoFocus
          maxLength={14}
        />
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            className="flex-1"
            onClick={() => {
              setStep("creds");
              setTotpToken("");
            }}
            disabled={pending}
          >
            Back
          </Button>
          <Button
            type="button"
            variant="spike"
            className="flex-1"
            disabled={pending || !totpToken}
            onClick={() => finalSignIn(totpToken)}
          >
            {pending ? "Verifying..." : "Verify"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => {
            const pre = await fetch("/api/auth/precheck", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ email, password }),
            });
            if (!pre.ok) {
              toast.error("Invalid credentials");
              return;
            }
            const j = await pre.json();
            if (j.needs2FA) {
              setStep("totp");
              return;
            }
            finalSignIn();
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
