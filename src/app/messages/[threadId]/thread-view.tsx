"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Message {
  id: string;
  body: string;
  senderId: string;
  createdAt: string;
}

export function ThreadView({
  threadId,
  currentUserId,
  otherName,
  initial,
}: {
  threadId: string;
  currentUserId: string;
  otherName: string;
  initial: Message[];
}) {
  const [messages, setMessages] = useState<Message[]>(initial);
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();
  const tail = useRef<HTMLDivElement>(null);

  useEffect(() => {
    tail.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  const send = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const res = await fetch(`/api/messages/${threadId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: trimmed }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(j.error ?? "Send failed");
        return;
      }
      const j = await res.json();
      setMessages([...messages, { ...j.message, createdAt: new Date(j.message.createdAt).toISOString() }]);
      setDraft("");
    });
  };

  return (
    <div>
      <h1 className="font-display text-3xl mb-6">{otherName}</h1>

      <div className="space-y-2 mb-6 min-h-[40vh] max-h-[60vh] overflow-y-auto pr-1 scrollbar-thin">
        {messages.length === 0 && (
          <p className="text-center text-muted-foreground italic py-8 text-sm">
            Say something.
          </p>
        )}
        {messages.map((m) => {
          const mine = m.senderId === currentUserId;
          return (
            <div
              key={m.id}
              className={mine ? "flex justify-end" : "flex justify-start"}
            >
              <div
                className={
                  mine
                    ? "max-w-[80%] bg-primary/15 border border-primary/30 rounded-sm px-3 py-2"
                    : "max-w-[80%] bg-card border border-border rounded-sm px-3 py-2"
                }
              >
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {m.body}
                </p>
                <p className="text-[9px] uppercase tracking-widest text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(m.createdAt), {
                    addSuffix: true,
                  })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={tail} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="border-t border-border/60 pt-4 space-y-2"
      >
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`Message ${otherName}...`}
          rows={3}
          maxLength={4000}
        />
        <div className="flex justify-end">
          <Button
            type="submit"
            variant="spike"
            size="sm"
            disabled={pending || !draft.trim()}
          >
            {pending ? "Sending..." : "Send"}
          </Button>
        </div>
      </form>
    </div>
  );
}
