"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Upload, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function ImageUpload({
  scope,
  ownerId,
  value,
  onChange,
  label = "Image",
  aspect = "square",
}: {
  scope: "band" | "article" | "user" | "show";
  ownerId: string;
  value: string | null;
  onChange: (url: string | null) => void;
  label?: string;
  aspect?: "square" | "wide" | "tall";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const aspectClass =
    aspect === "wide" ? "aspect-[3/1]" : aspect === "tall" ? "aspect-[2/3]" : "aspect-square";

  const upload = async (file: File) => {
    setBusy(true);
    try {
      const presignRes = await fetch("/api/uploads/presign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          scope,
          ownerId,
          contentType: file.type,
          contentLength: file.size,
        }),
      });
      if (!presignRes.ok) {
        const j = await presignRes.json().catch(() => ({}));
        throw new Error(j.error ?? `presign failed (${presignRes.status})`);
      }
      const { uploadUrl, publicUrl } = await presignRes.json();

      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "content-type": file.type },
      });
      if (!putRes.ok) throw new Error(`upload failed (${putRes.status})`);

      onChange(publicUrl);
      toast.success("Uploaded");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upload failed";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">
        {label}
      </p>
      <div
        className={`relative ${aspectClass} max-w-xs border border-dashed border-border rounded-sm bg-card/40 overflow-hidden`}
      >
        {value ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(null)}
              className="absolute top-2 right-2 bg-background/80 border border-border rounded-sm p-1 hover:text-destructive"
              aria-label="Remove"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-card/60 transition-colors"
            disabled={busy}
          >
            {busy ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Upload className="h-5 w-5" />
                Click to upload
              </>
            )}
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
          e.target.value = "";
        }}
      />
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => inputRef.current?.click()}
          className="mt-2"
          disabled={busy}
        >
          Replace
        </Button>
      )}
    </div>
  );
}
