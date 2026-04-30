import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { notify } from "@/server/notifications";

export const runtime = "nodejs";

const Body = z.object({
  decision: z.enum(["approve", "reject"]),
  note: z.string().max(2000).optional(),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !["EDITOR", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 422 });
  }

  const app = await db.authorApplication.findUnique({ where: { id } });
  if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (app.status !== "PENDING") {
    return NextResponse.json({ error: "Already decided" }, { status: 409 });
  }

  const status = parsed.data.decision === "approve" ? "APPROVED" : "REJECTED";

  await db.$transaction(async (tx) => {
    await tx.authorApplication.update({
      where: { id },
      data: {
        status,
        decisionNote: parsed.data.note ?? null,
        decidedById: session.user.id,
        decidedAt: new Date(),
      },
    });
    if (status === "APPROVED") {
      // Only promote if still READER (don't demote anyone)
      await tx.user.updateMany({
        where: { id: app.userId, role: "READER" },
        data: { role: "AUTHOR" },
      });
    }
  });

  await notify({
    userId: app.userId,
    kind: "SYSTEM",
    title:
      status === "APPROVED"
        ? "Welcome — you're an author"
        : "Author application update",
    body:
      status === "APPROVED"
        ? "You can now publish articles. Pitch a piece anytime."
        : parsed.data.note ?? "Your author application was not approved this time.",
    url: status === "APPROVED" ? "/articles/new" : "/become-author",
    refKey: `application-${id}`,
  });

  return NextResponse.json({ ok: true, status });
}
