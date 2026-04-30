import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";

export const runtime = "nodejs";

/**
 * Magic-link click target.
 *
 * The actual session cookie is issued by NextAuth's Credentials provider via
 * a signIn("magic", { token }) call from the client. We just hand the token
 * off to a small client page that performs the call and redirects.
 */
export function GET(req: NextRequest) {
  const t = req.nextUrl.searchParams.get("t");
  if (!t) {
    return NextResponse.redirect(new URL("/auth/signin?err=invalid", req.url));
  }
  const u = new URL("/auth/magic", env.NEXT_PUBLIC_APP_URL);
  u.searchParams.set("t", t);
  return NextResponse.redirect(u);
}
