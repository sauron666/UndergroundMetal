"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

const FLAGS = { en: "EN", bg: "БГ" } as const;

export function LocaleSwitcher({ current }: { current: "en" | "bg" }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const change = (locale: "en" | "bg") => {
    if (locale === current) return;
    startTransition(async () => {
      await fetch("/api/i18n", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locale }),
      });
      router.refresh();
    });
  };

  return (
    <div className="flex items-center gap-1 text-[10px] uppercase tracking-widest font-mono">
      {(["en", "bg"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => change(l)}
          disabled={pending}
          className={
            l === current
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground"
          }
        >
          {FLAGS[l]}
        </button>
      ))}
    </div>
  );
}
