import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { UserListForm } from "./form";

export const metadata: Metadata = { title: "New list" };

export default async function NewListPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin?next=/lists/new");

  return (
    <div className="container py-10 md:py-14 max-w-2xl">
      <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-2">
        ⛧ Curate
      </p>
      <h1 className="font-display text-4xl mb-6">New list</h1>
      <UserListForm />
    </div>
  );
}
