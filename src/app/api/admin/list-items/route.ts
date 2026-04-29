import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

async function requireStaff() {
  const session = await auth();
  if (!session?.user || !["EDITOR", "ADMIN"].includes(session.user.role)) return null;
  return session;
}

const PostBody = z.object({
  listId: z.string(),
  bandId: z.string(),
  position: z.number().int().min(0).max(9999).default(0),
  note: z.string().max(2000).nullable().optional(),
});

export async function POST(req: Request) {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const parsed = PostBody.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 422 });
  }
  const item = await db.bandListItem.upsert({
    where: {
      listId_bandId: {
        listId: parsed.data.listId,
        bandId: parsed.data.bandId,
      },
    },
    create: parsed.data,
    update: { position: parsed.data.position, note: parsed.data.note },
  });
  return NextResponse.json({ item });
}

const PatchBody = z.object({
  listId: z.string(),
  bandId: z.string(),
  position: z.number().int().min(0).max(9999).optional(),
  note: z.string().max(2000).nullable().optional(),
});

export async function PATCH(req: Request) {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const parsed = PatchBody.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 422 });
  }
  const { listId, bandId, ...rest } = parsed.data;
  const item = await db.bandListItem.update({
    where: { listId_bandId: { listId, bandId } },
    data: rest,
  });
  return NextResponse.json({ item });
}

export async function DELETE(req: Request) {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const url = new URL(req.url);
  const listId = url.searchParams.get("listId");
  const bandId = url.searchParams.get("bandId");
  if (!listId || !bandId) {
    return NextResponse.json({ error: "Missing ids" }, { status: 400 });
  }
  await db.bandListItem
    .delete({ where: { listId_bandId: { listId, bandId } } })
    .catch(() => null);
  return NextResponse.json({ ok: true });
}
