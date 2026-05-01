import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge middleware. Two responsibilities right now:
 *
 *   1. Maintenance mode. When MAINTENANCE_MODE=1 we 503 every page and
 *      most APIs, but keep /api/health and the static asset paths alive
 *      so external probes (and operators inspecting the box) can still
 *      see what's going on.
 *
 *   2. Nothing else yet. NextAuth session reads happen in route handlers
 *      and RSC, not here. CSP is set via next.config headers.
 *
 * Keep this file fast — it runs on every request including assets.
 */

const MAINT_ALLOW = [
  "/api/health",
  "/api/csp-report",
  "/_next",
  "/favicon",
  "/robots.txt",
  "/manifest.webmanifest",
];

export function middleware(req: NextRequest) {
  if (process.env.MAINTENANCE_MODE === "1") {
    const { pathname } = req.nextUrl;
    if (!MAINT_ALLOW.some((p) => pathname.startsWith(p))) {
      return new NextResponse(
        JSON.stringify({ error: "Maintenance mode" }),
        {
          status: 503,
          headers: {
            "content-type": "application/json",
            "retry-after": "120",
            "cache-control": "no-store",
          },
        }
      );
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\..*).*)"],
};
