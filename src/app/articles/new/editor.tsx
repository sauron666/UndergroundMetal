"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import { Bold, Italic, List, ListOrdered, Quote, Link2, Heading2, Heading3, Plus, Trash2, ShieldCheck, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { ArticleType } from "@prisma/client";

type Citation = {
  url: string;
  title?: string;
  publisher?: string;
  kind: "PRIMARY" | "INTERVIEW" | "SECONDARY" | "ACADEMIC" | "ARCHIVAL";
  excerpt?: string;
};

const TYPES: ArticleType[] = [
  "NEWS", "REVIEW", "INTERVIEW", "FEATURE", "OPINION", "GUIDE", "BAND_OF_THE_WEEK",
];

export function ArticleEditor() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [type, setType] = useState<ArticleType>("REVIEW");
  const [rating, setRating] = useState<string>("");
  const [citations, setCitations] = useState<Citation[]>([]);
  const [moderation, setModeration] = useState<{
    verdict: string;
    summary: string;
    factualClaims: { claim: string; cited: boolean }[];
    missingCitations: string[];
    qualityIssues: string[];
  } | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Image.configure({
        HTMLAttributes: { class: "rounded-sm border border-border my-3" },
      }),
      Placeholder.configure({ placeholder: "Write your piece..." }),
    ],
    content: "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose prose-invert max-w-none min-h-[400px] focus:outline-none p-4 border border-border rounded-sm bg-background/40",
      },
    },
  });

  const submit = (status: "DRAFT" | "IN_REVIEW") => {
    if (!title.trim() || !editor) {
      toast.error("Title and body are required");
      return;
    }
    const content = editor.getJSON();
    const text = editor.getText();
    startTransition(async () => {
      const res = await fetch("/api/articles", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title,
          subtitle: subtitle || undefined,
          excerpt: excerpt || undefined,
          type,
          rating: rating ? Number(rating) : undefined,
          content,
          contentText: text,
          citations,
          status,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(j.error ?? "Save failed");
        return;
      }
      const j = await res.json();
      toast.success(status === "DRAFT" ? "Saved draft" : "Submitted for review");
      router.push(`/articles/${j.article.slug}/edit`);
    });
  };

  const checkAi = () => {
    if (!editor) return;
    const text = editor.getText();
    if (text.length < 100) {
      toast.error("Write something more substantial first");
      return;
    }
    startTransition(async () => {
      const res = await fetch("/api/moderate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, body: text, citations }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(j.error ?? "AI check failed");
        return;
      }
      const j = await res.json();
      setModeration(j);
      toast.success(`AI verdict: ${j.verdict}`);
    });
  };

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-6">
      <div className="space-y-4">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="text-2xl h-14 font-display"
        />
        <Input
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          placeholder="Subtitle (optional)"
        />
        <Textarea
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          placeholder="Excerpt (160 chars, used for previews + SEO)"
          maxLength={200}
          rows={2}
        />

        <div className="flex flex-wrap gap-2 items-center">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as ArticleType)}
            className="h-9 bg-background/60 border border-input rounded-sm px-3 text-sm uppercase tracking-widest"
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          {type === "REVIEW" && (
            <Input
              value={rating}
              onChange={(e) => setRating(e.target.value)}
              placeholder="Rating /100"
              type="number"
              min={0}
              max={100}
              className="w-32"
            />
          )}
        </div>

        {/* Toolbar */}
        {editor && (
          <div className="flex flex-wrap gap-1 border border-border rounded-sm p-1 bg-card/40">
            <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")}>
              <Bold className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")}>
              <Italic className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })}>
              <Heading2 className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })}>
              <Heading3 className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")}>
              <List className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")}>
              <ListOrdered className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")}>
              <Quote className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => {
                const url = prompt("URL:");
                if (url) editor.chain().focus().setLink({ href: url }).run();
              }}
              active={editor.isActive("link")}
            >
              <Link2 className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={async () => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = "image/*";
                input.onchange = async () => {
                  const file = input.files?.[0];
                  if (!file) return;
                  toast.message("Uploading...");
                  // Use the user scope so any signed-in author can upload
                  // — server applies S3 presign with their userId.
                  const presignRes = await fetch("/api/uploads/presign", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({
                      scope: "user",
                      ownerId: "self",
                      contentType: file.type,
                      contentLength: file.size,
                    }),
                  });
                  if (!presignRes.ok) {
                    const j = await presignRes.json().catch(() => ({}));
                    toast.error(j.error ?? "Presign failed");
                    return;
                  }
                  const { uploadUrl, publicUrl } = await presignRes.json();
                  const put = await fetch(uploadUrl, {
                    method: "PUT",
                    body: file,
                    headers: { "content-type": file.type },
                  });
                  if (!put.ok) {
                    toast.error("Upload failed");
                    return;
                  }
                  editor.chain().focus().setImage({ src: publicUrl }).run();
                  toast.success("Inserted");
                };
                input.click();
              }}
            >
              <ImagePlus className="h-3.5 w-3.5" />
            </ToolbarButton>
          </div>
        )}

        <EditorContent editor={editor} />

        <div className="flex flex-wrap gap-2 items-center justify-between border-t border-border/60 pt-4">
          <Button variant="outline" onClick={checkAi} disabled={pending}>
            <ShieldCheck className="h-4 w-4" /> AI check
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => submit("DRAFT")} disabled={pending}>
              Save draft
            </Button>
            <Button variant="spike" onClick={() => submit("IN_REVIEW")} disabled={pending}>
              Submit for review
            </Button>
          </div>
        </div>
      </div>

      <aside className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sources</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {citations.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Every factual claim should be cited.
              </p>
            )}
            {citations.map((c, i) => (
              <div
                key={i}
                className="border border-border/60 rounded-sm p-2 text-xs space-y-1"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="break-all text-foreground">{c.title || c.url}</p>
                  <button
                    onClick={() =>
                      setCitations(citations.filter((_, j) => j !== i))
                    }
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <Badge variant="ghost">{c.kind.toLowerCase()}</Badge>
              </div>
            ))}
            <CitationForm onAdd={(c) => setCitations([...citations, c])} />
          </CardContent>
        </Card>

        {moderation && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" /> AI editor
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <Badge
                variant={
                  moderation.verdict === "APPROVED"
                    ? "blood"
                    : moderation.verdict === "FLAGGED"
                    ? "default"
                    : "rust"
                }
              >
                {moderation.verdict}
              </Badge>
              <p className="text-muted-foreground italic">{moderation.summary}</p>
              {moderation.missingCitations.length > 0 && (
                <div>
                  <p className="text-foreground mb-1">Missing citations:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    {moderation.missingCitations.map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                </div>
              )}
              {moderation.factualClaims.filter((c) => !c.cited).length > 0 && (
                <div>
                  <p className="text-foreground mb-1">Uncited factual claims:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    {moderation.factualClaims
                      .filter((c) => !c.cited)
                      .map((c, i) => (
                        <li key={i}>{c.claim}</li>
                      ))}
                  </ul>
                </div>
              )}
              {moderation.qualityIssues.length > 0 && (
                <div>
                  <p className="text-foreground mb-1">Quality:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    {moderation.qualityIssues.map((q, i) => (
                      <li key={i}>{q}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </aside>
    </div>
  );
}

function ToolbarButton({
  children,
  onClick,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`p-2 hover:bg-secondary rounded-sm ${active ? "bg-secondary text-primary" : ""}`}
    >
      {children}
    </button>
  );
}

function CitationForm({ onAdd }: { onAdd: (c: Citation) => void }) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<Citation["kind"]>("SECONDARY");

  return (
    <div className="space-y-2 border-t border-border/60 pt-3">
      <Input
        placeholder="URL"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        type="url"
        className="h-8 text-xs"
      />
      <Input
        placeholder="Title (optional)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="h-8 text-xs"
      />
      <select
        value={kind}
        onChange={(e) => setKind(e.target.value as Citation["kind"])}
        className="h-8 text-xs bg-background/60 border border-input rounded-sm px-2 w-full"
      >
        <option value="PRIMARY">Primary (band/label)</option>
        <option value="INTERVIEW">Interview</option>
        <option value="SECONDARY">Secondary (press)</option>
        <option value="ACADEMIC">Academic</option>
        <option value="ARCHIVAL">Archival</option>
      </select>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="w-full"
        disabled={!url}
        onClick={() => {
          onAdd({ url, title: title || undefined, kind });
          setUrl("");
          setTitle("");
        }}
      >
        <Plus className="h-3 w-3" /> Add source
      </Button>
    </div>
  );
}
