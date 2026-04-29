"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export function DeleteAccount({ hasPassword }: { hasPassword: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [current, setCurrent] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-4 w-4" /> Delete account
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-muted-foreground">
          Permanently removes your personal data. Articles you authored stay up
          but are reassigned to <code>deleted user</code>; comments are hidden.
          This cannot be undone.
        </p>
        {!open ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpen(true)}
            className="border-destructive/40 text-destructive hover:bg-destructive/10"
          >
            Delete my account
          </Button>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              startTransition(async () => {
                const res = await fetch("/api/account/delete", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({
                    confirm,
                    current: hasPassword ? current : undefined,
                  }),
                });
                if (!res.ok) {
                  const j = await res.json().catch(() => ({}));
                  toast.error(j.error ?? "Failed");
                  return;
                }
                toast.success("Account deleted.");
                router.push("/");
                router.refresh();
              });
            }}
            className="space-y-3"
          >
            {hasPassword && (
              <Input
                type="password"
                placeholder="Current password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                autoComplete="current-password"
                required
              />
            )}
            <Input
              placeholder='Type "DELETE" to confirm'
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                size="sm"
                disabled={
                  pending ||
                  confirm !== "DELETE" ||
                  (hasPassword && !current)
                }
              >
                {pending ? "Deleting..." : "I understand, delete forever"}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
