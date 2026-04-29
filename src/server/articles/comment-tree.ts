import { db } from "@/lib/db";
import type { CommentNode } from "@/components/articles/comments";

/**
 * Fetch all comments for an article in one query and build a nested tree
 * client-friendly shape. Hidden comments are kept (rendered as "[hidden]")
 * so reply chains stay coherent.
 */
export async function getCommentTree(articleId: string): Promise<CommentNode[]> {
  const flat = await db.comment.findMany({
    where: { articleId },
    orderBy: { createdAt: "asc" },
    include: {
      user: { select: { id: true, username: true, name: true, image: true } },
    },
  });

  const byId = new Map<string, CommentNode>();
  const roots: CommentNode[] = [];

  for (const c of flat) {
    byId.set(c.id, {
      id: c.id,
      body: c.body,
      hidden: c.hidden,
      createdAt: c.createdAt.toISOString(),
      user: c.user,
      replies: [],
    });
  }
  for (const c of flat) {
    const node = byId.get(c.id)!;
    if (c.parentId && byId.has(c.parentId)) {
      byId.get(c.parentId)!.replies.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}
