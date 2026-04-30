/**
 * RSS 2.0 + Atom feed builders. No external dependency — output is a single
 * XML string that can be returned from a route handler with the right
 * Content-Type.
 */

export interface FeedItem {
  title: string;
  link: string;
  description?: string;
  pubDate?: Date;
  guid?: string;
  author?: string;
  categories?: string[];
}

export interface FeedMeta {
  title: string;
  description: string;
  link: string;
  selfLink: string;
  language?: string;
  updatedAt?: Date;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function rfc822(d: Date): string {
  return d.toUTCString();
}

export function buildRss(meta: FeedMeta, items: FeedItem[]): string {
  const updated = meta.updatedAt ?? new Date();
  const body = items
    .map((it) => {
      const guid = it.guid ?? it.link;
      const parts = [
        `<title>${escapeXml(it.title)}</title>`,
        `<link>${escapeXml(it.link)}</link>`,
        `<guid isPermaLink="false">${escapeXml(guid)}</guid>`,
      ];
      if (it.description) {
        parts.push(`<description>${escapeXml(it.description)}</description>`);
      }
      if (it.pubDate) {
        parts.push(`<pubDate>${rfc822(it.pubDate)}</pubDate>`);
      }
      if (it.author) {
        parts.push(`<author>${escapeXml(it.author)}</author>`);
      }
      if (it.categories?.length) {
        for (const c of it.categories) {
          parts.push(`<category>${escapeXml(c)}</category>`);
        }
      }
      return `<item>${parts.join("")}</item>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>${escapeXml(meta.title)}</title>
<link>${escapeXml(meta.link)}</link>
<description>${escapeXml(meta.description)}</description>
<language>${escapeXml(meta.language ?? "en")}</language>
<lastBuildDate>${rfc822(updated)}</lastBuildDate>
<atom:link href="${escapeXml(meta.selfLink)}" rel="self" type="application/rss+xml" />
${body}
</channel>
</rss>`;
}
