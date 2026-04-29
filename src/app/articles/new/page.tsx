import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ArticleEditor } from "./editor";

export const metadata: Metadata = { title: "New article" };

export default async function NewArticlePage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin?next=/articles/new");

  return (
    <div className="container py-10 md:py-14 max-w-4xl">
      <header className="mb-8">
        <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-2">
          ⛧ Pitch
        </p>
        <h1 className="font-display text-4xl md:text-5xl">New article</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          Every claim of fact needs a source. Add citations as you write — our
          AI editor will scan for missing ones before review.
        </p>
      </header>
      <ArticleEditor />
    </div>
  );
}
