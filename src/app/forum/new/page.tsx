import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { NewThreadForm } from "./form";

export const metadata: Metadata = { title: "New thread" };

export default async function NewThread() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin?next=/forum/new");

  return (
    <div className="container py-10 md:py-14 max-w-2xl">
      <h1 className="font-display text-3xl mb-6">New thread</h1>
      <NewThreadForm />
    </div>
  );
}
