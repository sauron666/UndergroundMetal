import { describe, it, expect } from "vitest";
import { wilsonScore } from "@/lib/scoring";

describe("wilsonScore", () => {
  it("returns 0 for an empty sample", () => {
    expect(wilsonScore(0, 0)).toBe(0);
  });

  it("ranks more total votes higher than fewer at the same ratio", () => {
    const small = wilsonScore(1, 0);
    const big = wilsonScore(100, 0);
    expect(big).toBeGreaterThan(small);
  });

  it("penalises a single downvote heavily on tiny samples", () => {
    const high = wilsonScore(100, 0);
    const damaged = wilsonScore(1, 1);
    expect(high).toBeGreaterThan(damaged);
  });

  it("returns a value in [0, 1]", () => {
    for (const [u, d] of [
      [0, 5],
      [5, 0],
      [50, 50],
      [1, 1000],
    ] as const) {
      const s = wilsonScore(u, d);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(1);
    }
  });

  it("orders by 'best' the way Reddit's algorithm intends", () => {
    // 209 up, 50 down  vs. 5 up, 0 down — first should win on Wilson.
    expect(wilsonScore(209, 50)).toBeGreaterThan(wilsonScore(5, 0));
    // 5 up, 0 down vs. 1 up, 0 down — bigger sample wins.
    expect(wilsonScore(5, 0)).toBeGreaterThan(wilsonScore(1, 0));
  });
});
