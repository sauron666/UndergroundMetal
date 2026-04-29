import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { FestivalForm } from "./form";
import { LineupPanel } from "./lineup-panel";

export default async function AdminFestivalEdit({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const fest = await db.festival.findUnique({
    where: { slug },
    include: {
      bookings: {
        orderBy: [{ day: "asc" }, { position: "asc" }],
        include: { band: { select: { id: true, slug: true, name: true } } },
      },
    },
  });
  if (!fest) notFound();

  return (
    <div>
      <nav className="text-xs text-muted-foreground mb-4">
        <Link href="/admin/festivals" className="hover:text-foreground">
          Festivals
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{fest.name}</span>
      </nav>
      <h1 className="font-display text-3xl mb-2">{fest.name}</h1>
      <Link
        href={`/festivals/${fest.slug}`}
        className="text-xs uppercase tracking-widest text-muted-foreground hover:text-primary mb-6 inline-block"
      >
        View public page →
      </Link>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        <FestivalForm
          festival={{
            id: fest.id,
            name: fest.name,
            slug: fest.slug,
            startDate: fest.startDate.toISOString().slice(0, 10),
            endDate: fest.endDate.toISOString().slice(0, 10),
            city: fest.city,
            countryCode: fest.countryCode,
            venueName: fest.venueName,
            websiteUrl: fest.websiteUrl,
            posterUrl: fest.posterUrl,
            description: fest.description,
            status: fest.status,
            undergroundScore: fest.undergroundScore,
            verified: fest.verified,
          }}
        />
        <LineupPanel
          festivalId={fest.id}
          initial={fest.bookings.map((b) => ({
            bandId: b.bandId,
            bandSlug: b.band.slug,
            bandName: b.band.name,
            position: b.position,
            day: b.day,
            stage: b.stage,
          }))}
        />
      </div>
    </div>
  );
}
