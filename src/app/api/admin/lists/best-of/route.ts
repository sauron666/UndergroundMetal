import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { generateBestOf } from "@/server/ai/best-of";

export const runtime = "nodejs";

const Body = z.object({
  year: z.number().int().min(1970).max(2200),
  limit: z.number().int().min(5).max(50).default(25),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !["EDITOR", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 422 });
  }
  try {
    const result = await generateBestOf({
      year: parsed.data.year,
      curatorId: session.user.id,
      limit: parsed.data.limit,
    });
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed";
    const status = msg.includes("ANTHROPIC_API_KEY") ? 503 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
