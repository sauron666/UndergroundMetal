import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("t");
  if (!token) {
    return NextResponse.redirect(
      new URL("/?newsletter=error", env.NEXT_PUBLIC_APP_URL)
    );
  }
  const sub = await db.newsletterSubscriber.findUnique({
    where: { confirmToken: token },
  });
  if (!sub) {
    return NextResponse.redirect(
      new URL("/?newsletter=invalid", env.NEXT_PUBLIC_APP_URL)
    );
  }
  if (sub.status === "CONFIRMED") {
    return NextResponse.redirect(
      new URL("/?newsletter=already", env.NEXT_PUBLIC_APP_URL)
    );
  }
  await db.newsletterSubscriber.update({
    where: { id: sub.id },
    data: { status: "CONFIRMED", confirmedAt: new Date() },
  });
  return NextResponse.redirect(
    new URL("/?newsletter=confirmed", env.NEXT_PUBLIC_APP_URL)
  );
}
