import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { BandEditForm } from "./form";

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
    </div>
  );
}
