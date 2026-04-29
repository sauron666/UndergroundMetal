import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="container py-32 flex flex-col items-center text-center">
      <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
        Conjuring...
      </p>
    </div>
  );
}
