"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function DiscoveryHero() {
  const router = useRouter();
  const [q, setQ] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const trimmed = q.trim();
        if (!trimmed) return;
        router.push(`/discover?q=${encodeURIComponent(trimmed)}`);
      }}
      className="flex items-center gap-2 p-1 border border-border bg-card/60 backdrop-blur-sm ring-blood rounded-sm"
    >
      <Search className="ml-3 h-4 w-4 text-muted-foreground" />
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="e.g. Atmospheric black metal influenced by Slavic folklore"
        className="border-0 bg-transparent focus-visible:ring-0 h-12 text-base"
        autoComplete="off"
      />
      <Button type="submit" variant="spike" size="lg">
        Summon
      </Button>
    </form>
  );
}
