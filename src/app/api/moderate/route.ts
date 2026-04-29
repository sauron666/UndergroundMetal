import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { moderateArticle } from "@/server/ai/moderation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  title: z.string().min(1),
  body: z.string().min(50),
  citations: z
    .array(
      z.object({
        url: z.string(),
        title: z.string().nullish(),
        kind: z.string(),
      })
    )
    .default([]),
  articleId: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    const findings = await moderateArticle({
      title: parsed.data.title,
      body: parsed.data.body,
      citations: parsed.data.citations.map((c) => ({
        url: c.url,
        title: c.title ?? null,
        kind: c.kind,
      })),
      articleId: parsed.data.articleId,
    });
    return NextResponse.json(findings);
  } catch (err) {
    console.error("[moderate]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Moderation failed" },
      { status: 500 }
    );
  }
}
