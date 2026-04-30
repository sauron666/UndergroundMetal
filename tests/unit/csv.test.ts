import { describe, it, expect } from "vitest";
import { parseCsv } from "@/lib/csv";

describe("parseCsv", () => {
  it("parses a basic header + rows", () => {
    const out = parseCsv("a,b\n1,2\n3,4");
    expect(out).toEqual([
      { a: "1", b: "2" },
      { a: "3", b: "4" },
    ]);
  });

  it("handles quoted commas", () => {
    const out = parseCsv('name,city\n"Mayhem","Sofia, BG"');
    expect(out[0].city).toBe("Sofia, BG");
  });

  it("handles escaped quotes inside quotes", () => {
    const out = parseCsv('a\n"He said ""hi"""');
    expect(out[0].a).toBe('He said "hi"');
  });

  it("supports CRLF line endings", () => {
    const out = parseCsv("a,b\r\n1,2\r\n3,4");
    expect(out).toHaveLength(2);
  });

  it("ignores empty trailing lines", () => {
    const out = parseCsv("a\n1\n\n");
    expect(out).toHaveLength(1);
  });

  it("returns empty for empty input", () => {
    expect(parseCsv("")).toEqual([]);
  });
});
