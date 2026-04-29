import Link from "next/link";
import { Skull } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container py-32 text-center">
      <Skull className="h-16 w-16 text-primary mx-auto mb-6 animate-flicker" />
      <p className="font-blackletter text-7xl text-primary text-shadow-blood mb-4">
        404
      </p>
      <h1 className="font-display text-3xl mb-3">Lost in the catacombs.</h1>
      <p className="text-muted-foreground mb-8 max-w-md mx-auto">
        This page is dead. Or it never existed. Either way, it&apos;s not here.
      </p>
      <Button asChild variant="spike">
        <Link href="/">Return to surface</Link>
      </Button>
    </div>
  );
}
