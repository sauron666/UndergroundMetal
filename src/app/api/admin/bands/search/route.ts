import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || !["EDITOR", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ bands: [] });
  }
  const bands = await db.band.findMany({
    where: { name: { contains: q, mode: "insensitive" } },
    select: { id: true, slug: true, name: true },
    orderBy: { name: "asc" },
    take: 12,
  });
  return NextResponse.json({ bands });
}
