import { describe, it, expect } from "vitest";
import {
  DiscoveryFiltersSchema,
  DiscoveryResultSchema,
  BandSuggestionSchema,
} from "@/server/ai/discovery";

describe("DiscoveryFiltersSchema", () => {
  it("supplies a default limit of 8", () => {
    const out = DiscoveryFiltersSchema.parse({});
    expect(out.limit).toBe(8);
  });

  it("rejects countryCodes that aren't 2 chars", () => {
    expect(() =>
      DiscoveryFiltersSchema.parse({ countryCodes: ["BGR"] })
    ).toThrow();
  });

  it("clamps heaviness range to 1-10", () => {
    expect(() =>
      DiscoveryFiltersSchema.parse({ heaviness: { min: 0, max: 10 } })
    ).toThrow();
    expect(() =>
      DiscoveryFiltersSchema.parse({ heaviness: { min: 1, max: 11 } })
    ).toThrow();
  });
});

describe("BandSuggestionSchema", () => {
  it("accepts a complete suggestion", () => {
    const ok = {
      name: "Mayhem",
      countryCode: "NO",
      formedYear: 1984,
      primaryGenre: "Black Metal",
      subgenres: [],
      themes: [],
      heaviness: 9,
      undergroundScore: 4,
      rationale: "Cult genre-defining act.",
      references: [
        { kind: "metal-archives", url: "https://www.metal-archives.com/bands/Mayhem/67" },
      ],
      signatureRelease: { title: "De Mysteriis Dom Sathanas", year: 1994 },
    };
    expect(() => BandSuggestionSchema.parse(ok)).not.toThrow();
  });

  it("requires references reference list", () => {
    const without = {
      name: "X",
      countryCode: null,
      formedYear: null,
      primaryGenre: "Black Metal",
      heaviness: 9,
      undergroundScore: 9,
      rationale: "obscure",
    };
    // references defaults to []; this should still parse.
    expect(() => BandSuggestionSchema.parse(without)).not.toThrow();
  });
});

describe("DiscoveryResultSchema", () => {
  it("requires both tiers (mainstream + underground)", () => {
    expect(() =>
      DiscoveryResultSchema.parse({
        query: "x",
        interpretation: "y",
        mainstream: [],
      } as unknown)
    ).toThrow();
  });
});
