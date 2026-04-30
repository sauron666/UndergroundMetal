import { describe, it, expect, vi, beforeEach } from "vitest";

const { messagesCreate, dbMock } = vi.hoisted(() => ({
  messagesCreate: vi.fn(),
  dbMock: {
    moderationEvent: { create: vi.fn() },
  },
}));

vi.mock("@/server/ai/anthropic", () => ({
  getAnthropic: () => ({ messages: { create: messagesCreate } }),
  MODELS: { discovery: "claude-test", moderation: "claude-test" },
}));

vi.mock("@/lib/db", () => ({ db: dbMock }));

import { moderateArticle } from "@/server/ai/moderation";

beforeEach(() => {
  vi.clearAllMocks();
});

const PASS = {
  verdict: "APPROVED",
  summary: "All claims cited; tone is fine.",
  factualClaims: [],
  missingCitations: [],
  qualityIssues: [],
  toxicity: { score: 0 },
};

const FAIL = {
  verdict: "CHANGES_REQUESTED",
  summary: "One uncited factual claim.",
  factualClaims: [
    { claim: "Mayhem formed in 1984.", cited: false },
  ],
  missingCitations: ["Mayhem formed in 1984."],
  qualityIssues: [],
  toxicity: { score: 0 },
};

function asResp(json: unknown) {
  return { content: [{ type: "text", text: JSON.stringify(json) }] };
}

describe("moderateArticle()", () => {
  it("returns APPROVED for clean drafts", async () => {
    messagesCreate.mockResolvedValue(asResp(PASS));
    const out = await moderateArticle({
      title: "Mayhem 40 years later",
      body: "Long enough body to satisfy the input contract.",
      citations: [
        {
          url: "https://example.com/source",
          title: "Source",
          kind: "secondary",
        },
      ],
    });
    expect(out.verdict).toBe("APPROVED");
    expect(out.toxicity.score).toBe(0);
  });

  it("persists ModerationEvent when articleId is supplied", async () => {
    messagesCreate.mockResolvedValue(asResp(PASS));
    dbMock.moderationEvent.create.mockResolvedValue({});
    await moderateArticle({
      title: "X",
      body: "Long enough body to satisfy the input contract.",
      citations: [],
      articleId: "art_1",
    });
    expect(dbMock.moderationEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          articleId: "art_1",
          verdict: "APPROVED",
        }),
      })
    );
  });

  it("returns CHANGES_REQUESTED with missing citations populated", async () => {
    messagesCreate.mockResolvedValue(asResp(FAIL));
    const out = await moderateArticle({
      title: "X",
      body: "Long enough body to satisfy the input contract.",
      citations: [],
    });
    expect(out.verdict).toBe("CHANGES_REQUESTED");
    expect(out.missingCitations).toContain("Mayhem formed in 1984.");
  });

  it("rejects malformed model output", async () => {
    messagesCreate.mockResolvedValue({
      content: [{ type: "text", text: "not json" }],
    });
    await expect(
      moderateArticle({
        title: "X",
        body: "Long enough body to satisfy the input contract.",
        citations: [],
      })
    ).rejects.toThrow();
  });
});
