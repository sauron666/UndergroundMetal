import { NextResponse } from "next/server";
import { captureEvent } from "@/lib/observability";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * CSP violation collector. Wire into next.config CSP via:
 *
 *   "report-uri /api/csp-report; report-to default"
 *
 * Browsers POST application/csp-report (legacy) or application/reports+json
 * (Reporting API). We accept both, normalise, and forward to the
 * observability hook so they show up wherever exceptions do.
 *
 * Deliberately doesn't persist — high volume, low individual signal.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  // Legacy: { "csp-report": { ... } }. Reporting API: an array of reports.
  const reports = Array.isArray(body)
    ? body
    : body && typeof body === "object" && "csp-report" in body
      ? [(body as Record<string, unknown>)["csp-report"]]
      : [body];

  for (const r of reports) {
    if (!r || typeof r !== "object") continue;
    captureEvent("csp.violation", r as Record<string, unknown>);
  }
  return NextResponse.json({ ok: true });
}
