import { describe, it, expect } from "vitest";
import { jaccard, dot, normalise } from "@/lib/vector";

describe("jaccard", () => {
  it("returns 0 for two empty sets", () => {
    expect(jaccard([], [])).toBe(0);
  });

  it("returns 1 for identical sets", () => {
    expect(jaccard(["a", "b"], ["a", "b"])).toBe(1);
    expect(jaccard(["a", "b"], ["b", "a"])).toBe(1);
  });

  it("ignores duplicates inside a side", () => {
    expect(jaccard(["a", "a", "b"], ["a", "b"])).toBe(1);
  });

  it("computes the right ratio for partial overlap", () => {
    expect(jaccard(["a", "b", "c"], ["b", "c", "d"])).toBeCloseTo(0.5, 5);
  });

  it("returns 0 for disjoint sets", () => {
    expect(jaccard(["a"], ["b"])).toBe(0);
  });
});

describe("dot", () => {
  it("returns 0 on length mismatch", () => {
    expect(dot([1, 2], [1, 2, 3])).toBe(0);
  });

  it("computes the dot product", () => {
    expect(dot([1, 2, 3], [4, 5, 6])).toBe(32);
  });

  it("treats zero vectors as orthogonal", () => {
    expect(dot([0, 0, 0], [1, 2, 3])).toBe(0);
  });
});

describe("normalise", () => {
  it("yields unit length", () => {
    const v = normalise([3, 4]);
    const mag = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
    expect(mag).toBeCloseTo(1, 6);
  });

  it("returns the original on a zero vector", () => {
    expect(normalise([0, 0, 0])).toEqual([0, 0, 0]);
  });

  it("dot of two unit vectors derived from the same direction is 1", () => {
    const a = normalise([1, 2, 3]);
    const b = normalise([2, 4, 6]); // same direction
    expect(dot(a, b)).toBeCloseTo(1, 6);
  });
});
