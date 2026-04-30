import { describe, it, expect } from "vitest";
import { buildTicketUrl, providerLabel } from "@/server/affiliate";

describe("buildTicketUrl", () => {
  it("appends UTM params on a normal URL", () => {
    const out = buildTicketUrl("DIRECT", "https://venue.example/show", {
      campaign: "concert-listing",
    });
    const u = new URL(out);
    expect(u.searchParams.get("utm_source")).toBe("undergroundmetal");
    expect(u.searchParams.get("utm_medium")).toBe("affiliate");
    expect(u.searchParams.get("utm_campaign")).toBe("concert-listing");
  });

  it("preserves the original origin and pathname", () => {
    const out = buildTicketUrl("DIRECT", "https://venue.example/show?id=42");
    const u = new URL(out);
    expect(u.origin).toBe("https://venue.example");
    expect(u.pathname).toBe("/show");
    expect(u.searchParams.get("id")).toBe("42");
  });

  it("returns the original string when URL parsing fails", () => {
    const out = buildTicketUrl("DIRECT", "not a url");
    expect(out).toBe("not a url");
  });
});

describe("providerLabel", () => {
  it("maps known providers to readable names", () => {
    expect(providerLabel("TICKETPRO")).toBe("Ticketpro");
    expect(providerLabel("EVENTIM")).toBe("Eventim");
    expect(providerLabel("DIRECT")).toBe("Box office");
  });
});
