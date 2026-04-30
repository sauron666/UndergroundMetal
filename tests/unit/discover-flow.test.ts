import { describe, it, expect, vi, beforeEach } from "vitest";

const { messagesCreate, dbMock } = vi.hoisted(() => ({
  messagesCreate: vi.fn(),
  dbMock: {
    discoveryQuery: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/server/ai/anthropic", () => ({
  getAnthropic: () => ({ messages: { create: messagesCreate } }),
  MODELS: { discovery: "claude-test", moderation: "claude-test" },
}));

vi.mock("@/lib/db", () => ({ db: dbMock }));

import { discover } from "@/server/ai/discovery";

beforeEach(() => {
  vi.clearAllMocks();
});

const VALID_RESPONSE = {
  query: "atmospheric black metal",
  interpretation: "moody, slow, rural",
  inferredTags: ["forest", "winter"],
  mainstream: [
    {
      name: "Wolves in the Throne Room",
      countryCode: "US",
      formedYear: 2003,
      primaryGenre: "Atmospheric Black Metal",
      subgenres: [],
      themes: ["nature"],
      heaviness: 8,
      undergroundScore: 5,
      rationale: "Cascadian godfathers.",
      references: [
        {
          kind: "metal-archives",
          url: "https://www.metal-archives.com/bands/x/1",
        },
      ],
      signatureRelease: { title: "Two Hunters", year: 2007 },
    },
  ],
  underground: [],
  skip: [],
};

function asAnthropicResponse(json: unknown) {
  return {
    content: [{ type: "text", text: JSON.stringify(json) }],
  };
}

describe("discover()", () => {
  it("returns the cached row without calling Anthropic on a hit", async () => {
    dbMock.discoveryQuery.findUnique.mockResolvedValue({
      hash: "abc",
      result: VALID_RESPONSE,
    });
    dbMock.discoveryQuery.update.mockResolvedValue({});

    const out = await discover("atmospheric black metal", { limit: 8 });
    expect(out.cached).toBe(true);
    expect(messagesCreate).not.toHaveBeenCalled();
    expect(dbMock.discoveryQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { hash: expect.any(String) } })
    );
  });

  it("calls Anthropic on miss and persists the parsed result", async () => {
    dbMock.discoveryQuery.findUnique.mockResolvedValue(null);
    messagesCreate.mockResolvedValue(asAnthropicResponse(VALID_RESPONSE));
    dbMock.discoveryQuery.create.mockResolvedValue({});

    const out = await discover("atmospheric black metal", { limit: 8 });
    expect(out.cached).toBe(false);
    expect(out.mainstream).toHaveLength(1);
    expect(out.mainstream[0].name).toBe("Wolves in the Throne Room");
    expect(messagesCreate).toHaveBeenCalledOnce();
    expect(dbMock.discoveryQuery.create).toHaveBeenCalled();
  });

  it("throws when the model returns malformed JSON", async () => {
    dbMock.discoveryQuery.findUnique.mockResolvedValue(null);
    messagesCreate.mockResolvedValue({
      content: [{ type: "text", text: "no json here" }],
    });
    await expect(
      discover("anything", {})
    ).rejects.toThrow(/did not return JSON/i);
  });

  it("rejects responses missing the underground tier", async () => {
    dbMock.discoveryQuery.findUnique.mockResolvedValue(null);
    const broken = { ...VALID_RESPONSE };
    // remove a required field
    delete (broken as Record<string, unknown>).underground;
    messagesCreate.mockResolvedValue(asAnthropicResponse(broken));
    await expect(discover("x", {})).rejects.toThrow();
  });

  it("strips fenced code blocks the model sometimes adds", async () => {
    dbMock.discoveryQuery.findUnique.mockResolvedValue(null);
    messagesCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text: "```json\n" + JSON.stringify(VALID_RESPONSE) + "\n```",
        },
      ],
    });
    dbMock.discoveryQuery.create.mockResolvedValue({});
    const out = await discover("x", {});
    expect(out.mainstream[0].name).toBe("Wolves in the Throne Room");
  });
});
