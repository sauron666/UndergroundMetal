import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { BandEditForm } from "./form";
import { ReleasesPanel } from "./releases";
import { MembersPanel } from "./members";

export default async function AdminBandEdit({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const band = await db.band.findUnique({
    where: { slug },
    include: {
      genres: { include: { genre: true } },
      sources: true,
      releases: { orderBy: [{ year: "asc" }] },
      members: { include: { person: true }, orderBy: { current: "desc" } },
    },
  });
  if (!band) notFound();

  const genres = await db.genre.findMany({ orderBy: { name: "asc" } });

  return (
    <div>
      <nav className="text-xs text-muted-foreground mb-4">
        <Link href="/admin/bands" className="hover:text-foreground">
          Bands
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{band.name}</span>
      </nav>
      <h1 className="font-display text-3xl mb-2">{band.name}</h1>
      <Link
        href={`/bands/${band.slug}`}
        className="text-xs uppercase tracking-widest text-muted-foreground hover:text-primary mb-6 inline-block"
      >
        View public page →
      </Link>
      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        <BandEditForm
          band={{
            id: band.id,
            name: band.name,
            countryCode: band.countryCode,
            city: band.city,
            formedYear: band.formedYear,
            endedYear: band.endedYear,
            status: band.status,
            undergroundScore: band.undergroundScore,
            heaviness: band.heaviness,
            bio: band.bio,
            themes: band.themes,
            verified: band.verified,
            imageUrl: band.imageUrl,
            bannerUrl: band.bannerUrl,
            genreIds: band.genres.map((g) => g.genreId),
          }}
          genres={genres.map((g) => ({ id: g.id, name: g.name }))}
        />
        <div className="space-y-4">
          <ReleasesPanel
            bandId={band.id}
            initial={band.releases.map((r) => ({
              id: r.id,
              title: r.title,
              type: r.type,
              year: r.year,
              bandcampUrl: r.bandcampUrl,
              coverUrl: r.coverUrl,
            }))}
          />
          <MembersPanel
            bandId={band.id}
            initial={band.members.map((m) => ({
              id: m.id,
              role: m.role,
              current: m.current,
              fromYear: m.fromYear,
              toYear: m.toYear,
              person: { id: m.person.id, name: m.person.name },
            }))}
          />
        </div>
      </div>
    </div>
  );
}
