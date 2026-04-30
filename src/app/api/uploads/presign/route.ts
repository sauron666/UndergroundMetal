import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { presignUpload, type UploadScope } from "@/server/storage/s3";

export const runtime = "nodejs";

const Body = z.object({
  scope: z.enum(["band", "article", "user", "show"]),
  // The id of the owning entity. For "user" scope the user can only upload
  // for themselves; for band/article/show we check editor / author rights.
  ownerId: z.string(),
  contentType: z.string(),
  contentLength: z.number().int().positive(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const { scope, ownerId, contentType, contentLength } = parsed.data;

  // Authorisation per scope
  const isStaff = ["EDITOR", "ADMIN"].includes(session.user.role);
  switch (scope) {
    case "user":
      // "self" is a client-side convenience — accept either the literal "self"
      // or the actual user id to mean "upload to my own bucket folder".
      if (ownerId !== "self" && ownerId !== session.user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      break;
    case "band":
    case "show":
      if (!isStaff) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      break;
    case "article": {
      // Author can upload to their own article; staff can upload anywhere.
      if (!isStaff) {
        const article = await db.article.findUnique({
          where: { id: ownerId },
          select: { authorId: true },
        });
        if (!article || article.authorId !== session.user.id) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }
      break;
    }
  }

  try {
    const presigned = await presignUpload({
      scope: scope as UploadScope,
      // Resolve "self" to the real user id so storage keys remain stable.
      ownerId: ownerId === "self" ? session.user.id : ownerId,
      contentType,
      contentLength,
    });
    return NextResponse.json(presigned);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Presign failed";
    const status = msg.includes("not configured") ? 503 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
