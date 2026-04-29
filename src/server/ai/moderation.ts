/**
 * Article moderation orchestrator.
 *
 * Given a draft article (title + plaintext body + provided citations), Claude
 * (Haiku for cost) returns a structured verdict:
 *   - factual claims requiring a source (with the exact passage)
 *   - missing citations
 *   - stylistic / quality issues
 *   - a final verdict (APPROVED / CHANGES_REQUESTED / FLAGGED)
 *
 * Editors see this as a checklist before signing off. The result is also
 * persisted in ModerationEvent for audit.
 */

import { z } from "zod";
import { db } from "@/lib/db";
import { getAnthropic, MODELS } from "./anthropic";
import type { ModerationVerdict } from "@prisma/client";

export const ModerationFindingsSchema = z.object({
  verdict: z.enum(["APPROVED", "CHANGES_REQUESTED", "FLAGGED"]),
  summary: z.string(),
  factualClaims: z
    .array(
      z.object({
        claim: z.string(),
        passage: z.string().optional(),
        cited: z.boolean(),
        suggestedSourceType: z
          .enum(["primary", "interview", "secondary", "academic", "archival"])
          .optional(),
      })
    )
    .default([]),
  missingCitations: z.array(z.string()).default([]),
  qualityIssues: z.array(z.string()).default([]),
  toxicity: z.object({
    score: z.number().min(0).max(1),
    notes: z.string().optional(),
  }),
});

export type ModerationFindings = z.infer<typeof ModerationFindingsSchema>;

const SYSTEM = `You are a senior editor for an underground metal magazine.
Review the draft article for factual accuracy, sourcing rigor, and quality.

Rules:
  - Identify every concrete factual claim (dates, line-up changes, label deals,
    death claims, "first to do X", chart positions). For each, decide if it is
    cited via the provided citations list.
  - Genre opinions and reviews are NOT factual claims.
  - Flag missing citations with the exact passage that needs one.
  - Flag toxicity beyond the genre's normal tone (e.g. open Nazi rhetoric is a
    flag — NSBM coverage with critical context is not).
  - Verdict APPROVED only if no uncited factual claims and no toxicity issues.
  - Otherwise CHANGES_REQUESTED. Use FLAGGED only for severe policy violations.

Respond with JSON only. No prose.`;

export async function moderateArticle(input: {
  title: string;
  body: string;
  citations: { url: string; kind: string; title?: string | null }[];
  articleId?: string;
}): Promise<ModerationFindings> {
  const client = getAnthropic();
  const response = await client.messages.create({
    model: MODELS.moderation,
    max_tokens: 2048,
    system: [
      { type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } },
    ],
    messages: [
      {
        role: "user",
        content: [
          `TITLE: ${input.title}`,
          "",
          "CITATIONS:",
          input.citations.length
            ? input.citations
                .map((c, i) => `[${i + 1}] (${c.kind}) ${c.title ?? c.url} — ${c.url}`)
                .join("\n")
            : "(none provided)",
          "",
          "BODY:",
          input.body,
          "",
          "Return JSON with shape: { verdict, summary, factualClaims:[{claim,passage,cited,suggestedSourceType}], missingCitations:[], qualityIssues:[], toxicity:{score, notes} }",
        ].join("\n"),
      },
    ],
  });

  const text = response.content
    .map((c) => (c.type === "text" ? c.text : ""))
    .join("\n");
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  const parsed = ModerationFindingsSchema.parse(
    JSON.parse(text.slice(start, end + 1))
  );

  if (input.articleId) {
    await db.moderationEvent
      .create({
        data: {
          articleId: input.articleId,
          verdict: parsed.verdict as ModerationVerdict,
          notes: parsed.summary,
          aiFindings: parsed as object,
        },
      })
      .catch((e) => console.error("[moderation] persist failed", e));
  }

  return parsed;
}
