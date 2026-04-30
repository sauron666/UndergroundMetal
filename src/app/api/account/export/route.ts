import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { buildAccountExport } from "@/server/account/export";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const data = await buildAccountExport(session.user.id);
  const filename = `underground-metal-export-${session.user.id.slice(0, 8)}.json`;
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
