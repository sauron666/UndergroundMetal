import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { PersonForm } from "./form";

export default async function AdminPersonEdit({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const person = await db.person.findUnique({ where: { slug } });
  if (!person) notFound();

  return (
    <div>
      <nav className="text-xs text-muted-foreground mb-4">
        <span className="text-foreground">{person.name}</span>
      </nav>
      <h1 className="font-display text-3xl mb-2">{person.name}</h1>
      <Link
        href={`/people/${person.slug}`}
        className="text-xs uppercase tracking-widest text-muted-foreground hover:text-primary mb-6 inline-block"
      >
        View public page →
      </Link>
      <PersonForm
        person={{
          id: person.id,
          name: person.name,
          bornYear: person.bornYear,
          countryCode: person.countryCode,
          bio: person.bio,
        }}
      />
    </div>
  );
}
