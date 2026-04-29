"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldOff } from "lucide-react";
import { toast } from "sonner";

type Step = "idle" | "started" | "confirmed" | "disabling";

export function TwoFactorForm({
  enabled,
  hasPassword,
}: {
  enabled: boolean;
  hasPassword: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(enabled ? "confirmed" : "idle");
  const [pending, startTransition] = useTransition();
  const [secret, setSecret] = useState<string | null>(null);
  const [uri, setUri] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [disablePassword, setDisablePassword] = useState("");

  const start = () => {
    startTransition(async () => {
      const res = await fetch("/api/account/2fa/start", { method: "POST" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(j.error ?? "Failed");
        return;
      }
      const j = await res.json();
      setSecret(j.secret);
      setUri(j.uri);
      setStep("started");
    });
  };

  const confirm = () => {
    startTransition(async () => {
      const res = await fetch("/api/account/2fa/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(j.error ?? "Failed");
        return;
      }
      const j = await res.json();
      setRecoveryCodes(j.recoveryCodes);
      setStep("confirmed");
      setSecret(null);
      setUri(null);
      setToken("");
      toast.success("2FA enabled");
      router.refresh();
    });
  };

  const disable = () => {
    startTransition(async () => {
      const res = await fetch("/api/account/2fa/disable", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ current: disablePassword || undefined }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(j.error ?? "Failed");
        return;
      }
      setStep("idle");
      setRecoveryCodes(null);
      setDisablePassword("");
      toast.success("2FA disabled");
      router.refresh();
    });
  };

  const qrSrc = uri
    ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(uri)}&bgcolor=0a0a0a&color=e8e4d8&margin=4`
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          {enabled || step === "confirmed" ? (
            <ShieldCheck className="h-4 w-4 text-primary" />
          ) : (
            <ShieldOff className="h-4 w-4 text-muted-foreground" />
          )}
          Two-factor auth
          {enabled || step === "confirmed" ? (
            <Badge variant="blood" className="ml-auto">
              enabled
            </Badge>
          ) : (
            <Badge variant="ghost" className="ml-auto">
              disabled
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {step === "idle" && !enabled && (
          <>
            <p className="text-muted-foreground">
              Adds a one-time code from an authenticator app on top of your
              password. Recommended.
            </p>
            <Button variant="outline" size="sm" onClick={start} disabled={pending}>
              Set up 2FA
            </Button>
          </>
        )}

        {step === "started" && uri && secret && (
          <div className="space-y-3">
            <p className="text-muted-foreground">
              Scan the QR with your authenticator (Google Authenticator, Authy,
              Bitwarden, 1Password). Or paste this secret manually:
            </p>
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {qrSrc && (
                <img
                  src={qrSrc}
                  alt="2FA QR code"
                  width={180}
                  height={180}
                  className="border border-border rounded-sm"
                />
              )}
              <code className="text-xs bg-card border border-border rounded-sm px-3 py-2 break-all">
                {secret}
              </code>
            </div>
            <Input
              value={token}
              onChange={(e) => setToken(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="6-digit code from your app"
              maxLength={6}
              inputMode="numeric"
            />
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep("idle")}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button
                variant="spike"
                size="sm"
                onClick={confirm}
                disabled={pending || token.length !== 6}
              >
                Confirm
              </Button>
            </div>
          </div>
        )}

        {recoveryCodes && (
          <div className="border border-primary/40 bg-primary/5 rounded-sm p-3 space-y-2">
            <p className="text-xs uppercase tracking-widest text-primary">
              Recovery codes — save these now
            </p>
            <p className="text-xs text-muted-foreground">
              Each code is single-use. Use one if you lose your authenticator.
              They will not be shown again.
            </p>
            <div className="grid grid-cols-2 gap-2 font-mono text-xs">
              {recoveryCodes.map((c) => (
                <span
                  key={c}
                  className="px-2 py-1 bg-background border border-border rounded-sm"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}

        {step === "confirmed" && enabled && !recoveryCodes && (
          <>
            <p className="text-muted-foreground">
              2FA is active on this account.
            </p>
            <div className="space-y-2">
              {hasPassword && (
                <Input
                  type="password"
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                  placeholder="Current password to disable"
                />
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={disable}
                disabled={pending || (hasPassword && !disablePassword)}
              >
                Disable 2FA
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
