import { db } from "@/lib/db";
import { GenresManager } from "./manager";

export default async function AdminGenres() {
  const genres = await db.genre.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { bands: true } } },
  });
  return (
    <div>
      <h1 className="font-display text-3xl mb-6">Genres</h1>
      <GenresManager
        initial={genres.map((g) => ({
          id: g.id,
          slug: g.slug,
          name: g.name,
          heaviness: g.heaviness,
          parentId: g.parentId,
          bandCount: g._count.bands,
        }))}
      />
    </div>
  );
}
