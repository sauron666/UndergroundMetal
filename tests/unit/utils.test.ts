import { describe, it, expect } from "vitest";
import {
  slugify,
  truncate,
  formatPrice,
  hashString,
  formatDistance,
} from "@/lib/utils";

describe("slugify", () => {
  it("lowercases ASCII", () => {
    expect(slugify("Mayhem")).toBe("mayhem");
  });

  it("collapses whitespace and dashes", () => {
    expect(slugify("  Master's  Hammer  ")).toBe("masters-hammer");
  });

  it("strips diacritics", () => {
    expect(slugify("Negură Bunget")).toBe("negura-bunget");
  });

  it("drops symbols", () => {
    expect(slugify("Mgła!")).toBe("mga");
  });

  it("returns empty for whitespace-only", () => {
    expect(slugify("   ")).toBe("");
  });
});

describe("truncate", () => {
  it("returns original when under limit", () => {
    expect(truncate("abc", 10)).toBe("abc");
  });

  it("appends ellipsis on overflow", () => {
    expect(truncate("abcdefghij", 5)).toBe("abcd…");
  });
});

describe("formatPrice", () => {
  it("formats minor units", () => {
    const result = formatPrice(4000, "EUR");
    expect(result).toContain("40");
  });

  it("returns null for null input", () => {
    expect(formatPrice(null)).toBeNull();
  });
});

describe("hashString", () => {
  it("is deterministic", () => {
    expect(hashString("metal")).toBe(hashString("metal"));
  });

  it("differs across inputs", () => {
    expect(hashString("metal")).not.toBe(hashString("doom"));
  });
});

describe("formatDistance", () => {
  it("returns 'just now' under a minute", () => {
    expect(formatDistance(new Date())).toBe("just now");
  });

  it("formats minutes", () => {
    const d = new Date(Date.now() - 5 * 60 * 1000);
    expect(formatDistance(d)).toMatch(/m ago$/);
  });
});
