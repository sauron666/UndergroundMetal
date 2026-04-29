import { db } from "@/lib/db";
import type { CommentNode } from "@/components/articles/comments";

export type CommentSort = "best" | "new" | "top";

/**
 * Fetch all comments for an article, attach vote aggregates and the current
 * user's vote, and build a nested tree.
 *
 * Sort applies to *root-level* comments only — replies stay chronological
 * inside each thread.
 *
 *   - "best": Wilson lower-bound on (up, up+down). Resists vote-count gaming.
 *   - "new":  newest first.
 *   - "top":  raw score (up - down).
 */
export async function getCommentTree(
  articleId: string,
  currentUserId: string | null = null,
  sort: CommentSort = "best"
): Promise<CommentNode[]> {
  const flat = await db.comment.findMany({
    where: { articleId },
    orderBy: { createdAt: "asc" },
    include: {
      user: { select: { id: true, username: true, name: true, image: true } },
    },
  });

  if (flat.length === 0) return [];

  const votesByComment = await db.commentVote.groupBy({
    by: ["commentId", "value"],
    where: { commentId: { in: flat.map((c) => c.id) } },
    _count: true,
  });
  const upMap = new Map<string, number>();
  const downMap = new Map<string, number>();
  for (const v of votesByComment) {
    if (v.value === "UP") upMap.set(v.commentId, v._count);
    else downMap.set(v.commentId, v._count);
  }

  const myVotes = currentUserId
    ? await db.commentVote.findMany({
        where: {
          userId: currentUserId,
          commentId: { in: flat.map((c) => c.id) },
        },
        select: { commentId: true, value: true },
      })
    : [];
  const myVoteMap = new Map(myVotes.map((v) => [v.commentId, v.value]));

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
      voteUp: upMap.get(c.id) ?? 0,
      voteDown: downMap.get(c.id) ?? 0,
      myVote: (myVoteMap.get(c.id) as "UP" | "DOWN" | undefined) ?? null,
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

  if (sort === "new") {
    roots.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  } else if (sort === "top") {
    roots.sort(
      (a, b) =>
        (b.voteUp ?? 0) - (b.voteDown ?? 0) - ((a.voteUp ?? 0) - (a.voteDown ?? 0))
    );
  } else {
    // Wilson lower bound on upvote share. Stable for low-vote comments.
    const wilson = (up: number, down: number) => {
      const n = up + down;
      if (n === 0) return 0;
      const z = 1.96;
      const phat = up / n;
      return (
        (phat + (z * z) / (2 * n) -
          z * Math.sqrt((phat * (1 - phat) + (z * z) / (4 * n)) / n)) /
        (1 + (z * z) / n)
      );
    };
    roots.sort(
      (a, b) =>
        wilson(b.voteUp ?? 0, b.voteDown ?? 0) -
        wilson(a.voteUp ?? 0, a.voteDown ?? 0)
    );
  }

  return roots;
}
