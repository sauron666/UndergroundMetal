import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { ReleaseForm } from "./form";

interface PageProps {
  params: Promise<{ slug: string; id: string }>;
}

export default async function AdminReleaseEdit({ params }: PageProps) {
  const { slug, id } = await params;
  const release = await db.release.findFirst({
    where: { id, band: { slug } },
    include: { band: { select: { slug: true, name: true } } },
  });
  if (!release) notFound();

  return (
    <div>
      <nav className="text-xs text-muted-foreground mb-4">
        <Link href="/admin/bands" className="hover:text-foreground">
          Bands
        </Link>
        <span className="mx-2">/</span>
        <Link
          href={`/admin/bands/${release.band.slug}`}
          className="hover:text-foreground"
        >
          {release.band.name}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{release.title}</span>
      </nav>
      <h1 className="font-display text-3xl mb-2">{release.title}</h1>
      <Link
        href={`/bands/${release.band.slug}/${release.id}`}
        className="text-xs uppercase tracking-widest text-muted-foreground hover:text-primary mb-6 inline-block"
      >
        View public page →
      </Link>

      <ReleaseForm
        release={{
          id: release.id,
          title: release.title,
          type: release.type,
          year: release.year,
          releaseDate: release.releaseDate
            ? release.releaseDate.toISOString().slice(0, 10)
            : null,
          coverUrl: release.coverUrl,
          bandcampUrl: release.bandcampUrl,
          spotifyId: release.spotifyId,
          description: release.description,
          trackCount: release.trackCount,
          durationSec: release.durationSec,
        }}
      />
    </div>
  );
}
