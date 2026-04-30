import { describe, it, expect } from "vitest";
import { optimizedImage } from "@/lib/image";

describe("optimizedImage (no provider configured)", () => {
  it("passes URLs through when IMAGE_OPTIMIZE_PROVIDER is unset", () => {
    delete process.env.IMAGE_OPTIMIZE_PROVIDER;
    const url = "https://example.com/cover.jpg";
    expect(optimizedImage(url, { width: 600 })).toBe(url);
  });

  it("returns null for null input", () => {
    expect(optimizedImage(null)).toBeNull();
    expect(optimizedImage(undefined)).toBeNull();
  });
});
