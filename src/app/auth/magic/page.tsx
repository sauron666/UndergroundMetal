import type { Metadata } from "next";
import { MagicConsume } from "./consume";

export const metadata: Metadata = { title: "Signing in" };

export default async function MagicPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t } = await searchParams;
  return (
    <div className="container py-32 max-w-md text-center">
      <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-3">
        ⛧ Sign-in
      </p>
      <h1 className="font-display text-3xl mb-2">Verifying your link...</h1>
      <p className="text-sm text-muted-foreground">
        You&apos;ll be redirected once your session is established.
      </p>
      <MagicConsume token={t ?? null} />
    </div>
  );
}
