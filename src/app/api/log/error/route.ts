import { NextResponse } from "next/server";
import { z } from "zod";
import { captureException } from "@/lib/observability";

export const runtime = "nodejs";

const Body = z.object({
  message: z.string().max(2000),
  stack: z.string().max(20_000).optional(),
  digest: z.string().max(200).optional(),
  url: z.string().max(2000).optional(),
  userAgent: z.string().max(500).optional(),
});

/**
 * Client error sink. Browsers POST here from the global error boundary so
 * client-side rendering errors propagate into the same observability hook
 * we use server-side.
 */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: true });
  }
  const { message, stack, digest, url, userAgent } = parsed.data;
  const err = new Error(message);
  if (stack) err.stack = stack;
  captureException(err, {
    source: "client",
    digest,
    url,
    userAgent,
    referer: req.headers.get("referer"),
  });
  return NextResponse.json({ ok: true });
}
