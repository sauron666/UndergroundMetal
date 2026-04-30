import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { VenueForm } from "./form";

export default async function AdminVenueEdit({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const venue = await db.venue.findUnique({ where: { slug } });
  if (!venue) notFound();

  return (
    <div>
      <nav className="text-xs text-muted-foreground mb-4">
        <Link href="/admin/venues" className="hover:text-foreground">
          Venues
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{venue.name}</span>
      </nav>
      <h1 className="font-display text-3xl mb-6">{venue.name}</h1>
      <VenueForm venue={venue} />
    </div>
  );
}
