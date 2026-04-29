"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type State = "unsupported" | "denied" | "off" | "on" | "loading";

function urlBase64ToUint8Array(base64: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new ArrayBuffer(raw.length);
  const view = new Uint8Array(out);
  for (let i = 0; i < raw.length; ++i) view[i] = raw.charCodeAt(i);
  return out;
}

export function PushToggle({ vapidPublicKey }: { vapidPublicKey?: string | null }) {
  const [state, setState] = useState<State>("loading");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }
    navigator.serviceWorker.getRegistration("/").then(async (reg) => {
      if (!reg) {
        setState("off");
        return;
      }
      const sub = await reg.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    });
  }, []);

  if (state === "unsupported" || state === "denied") return null;

  const subscribe = async () => {
    if (!vapidPublicKey) {
      toast.error("Push notifications are not configured.");
      return;
    }
    try {
      const reg =
        (await navigator.serviceWorker.getRegistration("/")) ??
        (await navigator.serviceWorker.register("/sw.js"));
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState("denied");
        toast.error("Notifications were blocked.");
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
      const json = sub.toJSON();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
        }),
      });
      if (!res.ok) throw new Error(`subscribe failed (${res.status})`);
      setState("on");
      toast.success("Concert alerts enabled");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to enable alerts");
    }
  };

  const unsubscribe = async () => {
    try {
      const reg = await navigator.serviceWorker.getRegistration("/");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch(
          `/api/push/subscribe?endpoint=${encodeURIComponent(sub.endpoint)}`,
          { method: "DELETE" }
        );
        await sub.unsubscribe();
      }
      setState("off");
      toast.success("Alerts disabled");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={state === "on" ? unsubscribe : subscribe}
      disabled={state === "loading"}
    >
      {state === "on" ? (
        <>
          <BellRing className="h-3.5 w-3.5" /> Alerts on
        </>
      ) : state === "loading" ? (
        <Bell className="h-3.5 w-3.5 animate-pulse" />
      ) : (
        <>
          <BellOff className="h-3.5 w-3.5" /> Enable alerts
        </>
      )}
    </Button>
  );
}
