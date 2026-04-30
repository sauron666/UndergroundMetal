import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.hoisted() runs *before* the inline vi.mock factories, so we can share
// state between mocks and assertions without hitting initialization order
// problems.
const { messagesCreate, dbMock } = vi.hoisted(() => {
  return {
    messagesCreate: vi.fn(),
    dbMock: {
      articleBand: { findMany: vi.fn() },
      follow: { groupBy: vi.fn() },
      bandList: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
    },
  };
});

vi.mock("@/server/ai/anthropic", () => ({
  getAnthropic: () => ({
    messages: { create: messagesCreate },
  }),
  MODELS: { discovery: "claude-test", moderation: "claude-test" },
}));

vi.mock("@/lib/db", () => ({ db: dbMock }));

import { generateBestOf } from "@/server/ai/best-of";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("generateBestOf", () => {
  it("filters out hallucinated band names not in the corpus", async () => {
    dbMock.articleBand.findMany.mockResolvedValue([
      {
        bandId: "b1",
        article: {
          id: "a1",
          rating: 90,
          _count: { votes: 10, comments: 4 },
        },
        band: {
          id: "b1",
          name: "Mayhem",
          slug: "mayhem",
          countryCode: "NO",
          undergroundScore: 4,
          heaviness: 9,
        },
      },
    ]);
    dbMock.follow.groupBy.mockResolvedValue([
      { bandId: "b1", _count: 12 },
    ]);
    dbMock.bandList.findUnique.mockResolvedValue(null);
    dbMock.bandList.create.mockImplementation(
      ({ data }: { data: { slug: string; kind: string; year: number; published: boolean; items: { create: { bandId: string }[] } } }) =>
        Promise.resolve({ id: "list1", ...data })
    );

    messagesCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            intro: "test",
            picks: [
              { bandName: "Mayhem", rationale: "yes" },
              { bandName: "InventedBand", rationale: "halluc" },
            ],
          }),
        },
      ],
    });

    const result = await generateBestOf({
      year: 2026,
      curatorId: "u1",
      limit: 25,
    });

    expect(result.picks).toBe(1);
    expect(dbMock.bandList.create).toHaveBeenCalled();
    const created = dbMock.bandList.create.mock.calls[0][0].data;
    expect(created.kind).toBe("BEST_OF");
    expect(created.year).toBe(2026);
    expect(created.published).toBe(false);
    expect(created.items.create).toHaveLength(1);
    expect(created.items.create[0].bandId).toBe("b1");
  });

  it("throws when no articles tag any bands in the year", async () => {
    dbMock.articleBand.findMany.mockResolvedValue([]);
    await expect(
      generateBestOf({ year: 1999, curatorId: "u1" })
    ).rejects.toThrow(/No published articles/i);
    expect(messagesCreate).not.toHaveBeenCalled();
  });
});
