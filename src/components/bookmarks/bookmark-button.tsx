"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function BookmarkButton({
  target,
  initial,
  signedIn,
}: {
  target: { bandId?: string; articleId?: string };
  initial: boolean;
  signedIn: boolean;
}) {
  const router = useRouter();
  const [bookmarked, setBookmarked] = useState(initial);
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (!signedIn) {
          toast.error("Sign in to bookmark");
          router.push("/auth/signin");
          return;
        }
        const next = !bookmarked;
        setBookmarked(next);
        startTransition(async () => {
          const res = await fetch("/api/bookmarks", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ ...target, bookmark: next }),
          });
          if (!res.ok) {
            setBookmarked(!next);
            toast.error("Failed");
          }
        });
      }}
    >
      {bookmarked ? (
        <>
          <BookmarkCheck className="h-3.5 w-3.5 text-primary" /> Bookmarked
        </>
      ) : (
        <>
          <Bookmark className="h-3.5 w-3.5" /> Bookmark
        </>
      )}
    </Button>
  );
}
