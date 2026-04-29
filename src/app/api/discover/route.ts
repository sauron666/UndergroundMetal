import { NextResponse } from "next/server";
import { z } from "zod";
import { discover, attachLocalBands, DiscoveryFiltersSchema } from "@/server/ai/discovery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  query: z.string().min(2).max(500),
  filters: DiscoveryFiltersSchema.partial().optional(),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten() },
      { status: 422 }
    );
  }

  try {
    const raw = await discover(parsed.data.query, parsed.data.filters ?? {});
    const enriched = await attachLocalBands(raw);
    return NextResponse.json({ ...enriched, cached: raw.cached });
  } catch (err) {
    console.error("[discover]", err);
    const msg = err instanceof Error ? err.message : "Discovery failed";
    const status = msg.includes("ANTHROPIC_API_KEY") ? 503 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
