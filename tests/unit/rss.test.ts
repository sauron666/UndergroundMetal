import { describe, it, expect } from "vitest";
import { buildRss } from "@/lib/rss";

const meta = {
  title: "Underground Metal",
  description: "Test feed",
  link: "https://undergroundmetal.app",
  selfLink: "https://undergroundmetal.app/feed/articles.xml",
};

describe("buildRss", () => {
  it("emits a complete RSS 2.0 envelope", () => {
    const xml = buildRss(meta, []);
    expect(xml).toMatch(/<\?xml/);
    expect(xml).toMatch(/<rss version="2.0"/);
    expect(xml).toMatch(/<channel>/);
    expect(xml).toMatch(/<title>Underground Metal<\/title>/);
    expect(xml).toMatch(/atom:link/);
    expect(xml).toMatch(/<\/rss>/);
  });

  it("renders an item with all fields", () => {
    const pubDate = new Date(Date.UTC(2026, 5, 12, 19, 0, 0));
    const xml = buildRss(meta, [
      {
        title: "Mayhem live in Sofia",
        link: "https://undergroundmetal.app/concerts/x",
        description: "Cult & atmospheric",
        pubDate,
        guid: "urn:um:show:1",
        author: "editor",
        categories: ["BG", "live"],
      },
    ]);
    expect(xml).toMatch(/<item>/);
    expect(xml).toMatch(/<title>Mayhem live in Sofia<\/title>/);
    expect(xml).toMatch(/<guid isPermaLink="false">urn:um:show:1<\/guid>/);
    expect(xml).toMatch(/<category>BG<\/category>/);
    expect(xml).toMatch(/<category>live<\/category>/);
  });

  it("escapes ampersands and angle brackets", () => {
    const xml = buildRss(meta, [
      {
        title: "M & M <special>",
        link: "https://x/y?a=1&b=2",
      },
    ]);
    expect(xml).toContain("M &amp; M &lt;special&gt;");
    expect(xml).toContain("a=1&amp;b=2");
  });
});
