import { describe, it, expect } from "vitest";
import { buildUrlset, buildSitemapIndex } from "@/lib/sitemap-xml";

describe("buildUrlset", () => {
  it("emits a valid urlset envelope", () => {
    const xml = buildUrlset([
      { loc: "https://example.com/a", changefreq: "weekly", priority: 0.7 },
    ]);
    expect(xml).toMatch(/<\?xml/);
    expect(xml).toMatch(/<urlset/);
    expect(xml).toMatch(/<loc>https:\/\/example.com\/a<\/loc>/);
    expect(xml).toMatch(/<changefreq>weekly<\/changefreq>/);
    expect(xml).toMatch(/<priority>0.7<\/priority>/);
  });

  it("escapes ampersands", () => {
    const xml = buildUrlset([{ loc: "https://x/y?a=1&b=2" }]);
    expect(xml).toContain("a=1&amp;b=2");
  });

  it("renders W3C-format lastmod", () => {
    const xml = buildUrlset([
      { loc: "https://x", lastmod: new Date(Date.UTC(2026, 0, 2, 3, 4, 5)) },
    ]);
    expect(xml).toMatch(/2026-01-02T03:04:05/);
  });
});

describe("buildSitemapIndex", () => {
  it("emits a sitemapindex envelope with sitemap entries", () => {
    const xml = buildSitemapIndex([
      { loc: "https://x/sitemaps/static/1.xml", lastmod: new Date(0) },
      { loc: "https://x/sitemaps/bands/1.xml" },
    ]);
    expect(xml).toMatch(/<sitemapindex/);
    expect(xml).toMatch(/<sitemap><loc>https:\/\/x\/sitemaps\/static\/1.xml<\/loc>/);
    // Second has no lastmod
    expect(xml).toMatch(/<sitemap><loc>https:\/\/x\/sitemaps\/bands\/1.xml<\/loc><\/sitemap>/);
  });
});
