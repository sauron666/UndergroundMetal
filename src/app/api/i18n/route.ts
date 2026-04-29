import { NextResponse } from "next/server";
import { z } from "zod";
import { setLocale, LOCALES, type Locale } from "@/i18n";

const Body = z.object({ locale: z.enum(LOCALES as [Locale, ...Locale[]]) });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid locale" }, { status: 422 });
  }
  await setLocale(parsed.data.locale);
  return NextResponse.json({ ok: true });
}
