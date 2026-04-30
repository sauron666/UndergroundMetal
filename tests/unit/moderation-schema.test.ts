import { describe, it, expect } from "vitest";
import { ModerationFindingsSchema } from "@/server/ai/moderation";

describe("ModerationFindingsSchema", () => {
  it("accepts a passing review", () => {
    const ok = {
      verdict: "APPROVED",
      summary: "All facts cited; no toxicity.",
      factualClaims: [
        {
          claim: "Mayhem formed in 1984.",
          cited: true,
          suggestedSourceType: "primary",
        },
      ],
      missingCitations: [],
      qualityIssues: [],
      toxicity: { score: 0.0 },
    };
    expect(() => ModerationFindingsSchema.parse(ok)).not.toThrow();
  });

  it("rejects an unknown verdict", () => {
    expect(() =>
      ModerationFindingsSchema.parse({
        verdict: "MAYBE",
        summary: "...",
        toxicity: { score: 0 },
      })
    ).toThrow();
  });

  it("clamps toxicity score 0..1", () => {
    expect(() =>
      ModerationFindingsSchema.parse({
        verdict: "APPROVED",
        summary: "...",
        toxicity: { score: 1.5 },
      })
    ).toThrow();
  });

  it("supports CHANGES_REQUESTED with empty arrays", () => {
    const ok = {
      verdict: "CHANGES_REQUESTED",
      summary: "Two uncited claims.",
      missingCitations: ["Founding year claim"],
      toxicity: { score: 0 },
    };
    expect(() => ModerationFindingsSchema.parse(ok)).not.toThrow();
  });
});
