/**
 * Sitemap XML helpers — RFC-compliant sitemap.org 0.9 + Google sitemap-index.
 * No external dep.
 */

const ESCAPE_RE = /[&<>'"]/g;
const ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "'": "&apos;",
  '"': "&quot;",
};

function escape(s: string): string {
  return s.replace(ESCAPE_RE, (c) => ESCAPE_MAP[c] ?? c);
}

function w3cDate(d: Date): string {
  return d.toISOString();
}

export interface UrlEntry {
  loc: string;
  lastmod?: Date;
  changefreq?:
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "never";
  priority?: number; // 0.0 – 1.0
}

export function buildUrlset(entries: UrlEntry[]): string {
  const urls = entries
    .map(
      (e) =>
        `<url>` +
        `<loc>${escape(e.loc)}</loc>` +
        (e.lastmod ? `<lastmod>${w3cDate(e.lastmod)}</lastmod>` : "") +
        (e.changefreq ? `<changefreq>${e.changefreq}</changefreq>` : "") +
        (e.priority != null
          ? `<priority>${e.priority.toFixed(1)}</priority>`
          : "") +
        `</url>`
    )
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
}

export interface SitemapEntry {
  loc: string;
  lastmod?: Date;
}

export function buildSitemapIndex(entries: SitemapEntry[]): string {
  const items = entries
    .map(
      (e) =>
        `<sitemap>` +
        `<loc>${escape(e.loc)}</loc>` +
        (e.lastmod ? `<lastmod>${w3cDate(e.lastmod)}</lastmod>` : "") +
        `</sitemap>`
    )
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${items}</sitemapindex>`;
}
