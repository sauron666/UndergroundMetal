import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";
import type { ArticleType, ArticleStatus, CitationKind } from "@prisma/client";

export const runtime = "nodejs";

const Body = z.object({
  title: z.string().min(3).max(200),
  subtitle: z.string().max(300).optional(),
  excerpt: z.string().max(500).optional(),
  type: z.enum([
    "NEWS", "REVIEW", "INTERVIEW", "FEATURE", "OPINION", "GUIDE", "BAND_OF_THE_WEEK",
  ]),
  status: z.enum(["DRAFT", "IN_REVIEW"]).default("DRAFT"),
  rating: z.number().int().min(0).max(100).optional(),
  content: z.unknown(),
  contentText: z.string().optional(),
  citations: z
    .array(
      z.object({
        url: z.string().url(),
        title: z.string().optional(),
        publisher: z.string().optional(),
        kind: z.enum(["PRIMARY", "INTERVIEW", "SECONDARY", "ACADEMIC", "ARCHIVAL"]),
        excerpt: z.string().optional(),
      })
    )
    .default([]),
  bandIds: z.array(z.string()).default([]),
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

  const baseSlug = slugify(parsed.data.title).slice(0, 80) || "untitled";
  let slug = baseSlug;
  let attempt = 1;
  while (await db.article.findUnique({ where: { slug } })) {
    attempt += 1;
    slug = `${baseSlug}-${attempt}`;
    if (attempt > 100) break;
  }

  const article = await db.article.create({
    data: {
      slug,
      title: parsed.data.title,
      subtitle: parsed.data.subtitle,
      excerpt: parsed.data.excerpt,
      type: parsed.data.type as ArticleType,
      status: parsed.data.status as ArticleStatus,
      rating: parsed.data.rating,
      content: parsed.data.content as object,
      contentText: parsed.data.contentText,
      authorId: session.user.id,
      citations: {
        create: parsed.data.citations.map((c) => ({
          url: c.url,
          title: c.title,
          publisher: c.publisher,
          kind: c.kind as CitationKind,
          excerpt: c.excerpt,
        })),
      },
      bands: {
        create: parsed.data.bandIds.map((bandId) => ({ bandId })),
      },
    },
    select: { id: true, slug: true, status: true },
  });

  return NextResponse.json({ article }, { status: 201 });
}
