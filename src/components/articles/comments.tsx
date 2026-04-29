"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Reply, Trash2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export interface CommentNode {
  id: string;
  body: string;
  hidden: boolean;
  createdAt: string | Date;
  user: { id: string; username: string | null; name: string | null; image: string | null };
  replies: CommentNode[];
}

export function Comments({
  articleId,
  initial,
  currentUserId,
  isStaff,
}: {
  articleId: string;
  initial: CommentNode[];
  currentUserId: string | null;
  isStaff: boolean;
}) {
  const router = useRouter();
  const [comments, setComments] = useState<CommentNode[]>(initial);
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = (parentId: string | null, text: string, reset?: () => void) => {
    if (!currentUserId) {
      toast.error("Sign in to comment");
      router.push("/auth/signin");
      return;
    }
    if (!text.trim()) return;
    startTransition(async () => {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ articleId, body: text, parentId: parentId ?? undefined }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(j.error ?? "Failed to post");
        return;
      }
      const { comment } = await res.json();
      const node: CommentNode = { ...comment, replies: [] };
      setComments((prev) => insertNode(prev, parentId, node));
      reset?.();
      setBody("");
    });
  };

  const remove = (id: string) => {
    if (!confirm("Hide this comment?")) return;
    startTransition(async () => {
      const res = await fetch(`/api/comments?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Failed");
        return;
      }
      setComments((prev) => mapTree(prev, (n) => (n.id === id ? { ...n, hidden: true } : n)));
    });
  };

  const total = countVisible(comments);

  return (
    <section className="mt-12 pt-8 border-t border-border/60">
      <h2 className="font-display text-2xl mb-6 flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-primary" /> {total} comment{total === 1 ? "" : "s"}
      </h2>

      {currentUserId ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(null, body);
          }}
          className="mb-8 space-y-2"
        >
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Speak your mind..."
            rows={3}
            maxLength={4000}
          />
          <div className="flex justify-end">
            <Button type="submit" variant="spike" size="sm" disabled={pending || !body.trim()}>
              Post
            </Button>
          </div>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground mb-8 italic">
          <a href="/auth/signin" className="text-primary hover:underline">Sign in</a> to comment.
        </p>
      )}

      <div className="space-y-6">
        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Be the first.</p>
        ) : (
          comments.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              depth={0}
              currentUserId={currentUserId}
              isStaff={isStaff}
              onReply={submit}
              onDelete={remove}
              pending={pending}
            />
          ))
        )}
      </div>
    </section>
  );
}

function CommentItem({
  comment,
  depth,
  currentUserId,
  isStaff,
  onReply,
  onDelete,
  pending,
}: {
  comment: CommentNode;
  depth: number;
  currentUserId: string | null;
  isStaff: boolean;
  onReply: (parentId: string, text: string, reset?: () => void) => void;
  onDelete: (id: string) => void;
  pending: boolean;
}) {
  const [replying, setReplying] = useState(false);
  const [draft, setDraft] = useState("");

  const author = comment.user.username ?? comment.user.name ?? "anon";
  const created = formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true });
  const canRemove = !comment.hidden && (comment.user.id === currentUserId || isStaff);

  return (
    <div
      style={{ marginLeft: Math.min(depth, 4) * 16 }}
      className={depth > 0 ? "border-l border-border/60 pl-4" : undefined}
    >
      <div className="text-xs text-muted-foreground mb-1 flex items-center gap-2">
        <span className="text-foreground font-medium">{author}</span>
        <span>·</span>
        <span>{created}</span>
        {canRemove && (
          <button
            onClick={() => onDelete(comment.id)}
            className="ml-auto hover:text-destructive"
            aria-label="Hide"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>
      {comment.hidden ? (
        <p className="text-sm italic text-muted-foreground">[comment hidden]</p>
      ) : (
        <p className="text-sm whitespace-pre-wrap leading-relaxed">{comment.body}</p>
      )}
      {!comment.hidden && depth < 4 && (
        <button
          onClick={() => setReplying((r) => !r)}
          className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-primary mt-2 inline-flex items-center gap-1"
        >
          <Reply className="h-3 w-3" /> Reply
        </button>
      )}
      {replying && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onReply(comment.id, draft, () => {
              setDraft("");
              setReplying(false);
            });
          }}
          className="mt-2 space-y-2"
        >
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`Reply to ${author}...`}
            rows={2}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setReplying(false);
                setDraft("");
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="outline" size="sm" disabled={pending || !draft.trim()}>
              Reply
            </Button>
          </div>
        </form>
      )}
      {comment.replies.length > 0 && (
        <div className="mt-4 space-y-4">
          {comment.replies.map((r) => (
            <CommentItem
              key={r.id}
              comment={r}
              depth={depth + 1}
              currentUserId={currentUserId}
              isStaff={isStaff}
              onReply={onReply}
              onDelete={onDelete}
              pending={pending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function insertNode(
  list: CommentNode[],
  parentId: string | null,
  node: CommentNode
): CommentNode[] {
  if (parentId == null) return [...list, node];
  return list.map((c) =>
    c.id === parentId
      ? { ...c, replies: [...c.replies, node] }
      : { ...c, replies: insertNode(c.replies, parentId, node) }
  );
}

function mapTree(
  list: CommentNode[],
  fn: (n: CommentNode) => CommentNode
): CommentNode[] {
  return list.map((c) => ({ ...fn(c), replies: mapTree(c.replies, fn) }));
}

function countVisible(list: CommentNode[]): number {
  let n = 0;
  for (const c of list) {
    if (!c.hidden) n += 1;
    n += countVisible(c.replies);
  }
  return n;
}
