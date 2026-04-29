import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { ListForm } from "./form";
import { ListItemsPanel } from "./items-panel";

export default async function AdminListEdit({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const list = await db.bandList.findUnique({
    where: { slug },
    include: {
      items: {
        orderBy: { position: "asc" },
        include: { band: { select: { id: true, slug: true, name: true } } },
      },
    },
  });
  if (!list) notFound();

  return (
    <div>
      <nav className="text-xs text-muted-foreground mb-4">
        <Link href="/admin/lists" className="hover:text-foreground">
          Lists
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{list.title}</span>
      </nav>
      <h1 className="font-display text-3xl mb-2">{list.title}</h1>
      <Link
        href={`/lists/${list.slug}`}
        className="text-xs uppercase tracking-widest text-muted-foreground hover:text-primary mb-6 inline-block"
      >
        View public page →
      </Link>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        <ListForm
          list={{
            id: list.id,
            slug: list.slug,
            title: list.title,
            description: list.description,
            kind: list.kind,
            year: list.year,
            published: list.published,
            coverUrl: list.coverUrl,
          }}
        />
        <ListItemsPanel
          listId={list.id}
          initial={list.items.map((it) => ({
            bandId: it.bandId,
            bandSlug: it.band.slug,
            bandName: it.band.name,
            position: it.position,
            note: it.note,
          }))}
        />
      </div>
    </div>
  );
}
