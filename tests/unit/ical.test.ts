import { describe, it, expect } from "vitest";
import { buildIcs } from "@/server/ical";

describe("buildIcs", () => {
  it("emits a complete VCALENDAR envelope", () => {
    const ics = buildIcs("Test", []);
    expect(ics).toMatch(/BEGIN:VCALENDAR/);
    expect(ics).toMatch(/VERSION:2.0/);
    expect(ics).toMatch(/X-WR-CALNAME:Test/);
    expect(ics).toMatch(/END:VCALENDAR/);
  });

  it("renders a VEVENT block", () => {
    const start = new Date(Date.UTC(2026, 5, 12, 19, 0, 0));
    const ics = buildIcs("My fest", [
      {
        uid: "abc",
        start,
        summary: "Show with, comma",
        location: "Venue; Sofia",
        url: "https://example.com",
      },
    ]);
    expect(ics).toMatch(/UID:abc/);
    expect(ics).toMatch(/DTSTART:20260612T190000Z/);
    // commas and semicolons must be escaped
    expect(ics).toMatch(/SUMMARY:Show with\\, comma/);
    expect(ics).toMatch(/LOCATION:Venue\\; Sofia/);
    expect(ics).toMatch(/URL:https:\/\/example.com/);
  });

  it("uses CRLF line endings", () => {
    const ics = buildIcs("Test", []);
    expect(ics.includes("\r\n")).toBe(true);
  });
});
