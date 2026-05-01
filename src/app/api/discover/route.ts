import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { discover, attachLocalBands, DiscoveryFiltersSchema } from "@/server/ai/discovery";
import { consumeToken, ipKey, userKey } from "@/server/security/rate-limit";
import { captureException } from "@/lib/observability";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  query: z.string().min(2).max(500),
  filters: DiscoveryFiltersSchema.partial().optional(),
});

export async function POST(req: Request) {
  // Operator kill-switch documented in RUNBOOK.md — flip this when
  // Anthropic is in a bad state to fail fast with a clear message
  // instead of timing out per-request.
  if (process.env.DISCOVERY_DISABLED === "1") {
    return NextResponse.json(
      {
        error:
          "Discovery is temporarily disabled. We're working on it — try again shortly.",
      },
      { status: 503 }
    );
  }

  // Rate limit before parsing or hitting the LLM. Anonymous: 10 reqs/hour
  // per IP. Signed-in: 60 reqs/hour. Premium: 240/hour.
  const session = await auth();
  const tier = session?.user?.tier ?? "FREE";
  const cfg = !session?.user
    ? { capacity: 10, refillPerSec: 10 / 3600, key: ipKey(req, "discover") }
    : tier === "PREMIUM"
    ? { capacity: 240, refillPerSec: 240 / 3600, key: userKey(session.user.id, "discover") }
    : { capacity: 60, refillPerSec: 60 / 3600, key: userKey(session.user.id, "discover") };

  if (!(await consumeToken(cfg))) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again shortly." },
      { status: 429 }
    );
  }

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
    captureException(err, { route: "/api/discover", query: parsed.data.query });
    const msg = err instanceof Error ? err.message : "Discovery failed";
    const status = msg.includes("ANTHROPIC_API_KEY") ? 503 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
