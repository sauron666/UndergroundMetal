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
    where: { unsubscribeToken: token },
  });
  if (sub) {
    await db.newsletterSubscriber.update({
      where: { id: sub.id },
      data: { status: "UNSUBSCRIBED", unsubscribedAt: new Date() },
    });
  }
  return NextResponse.redirect(
    new URL("/?newsletter=unsubscribed", env.NEXT_PUBLIC_APP_URL)
  );
}
