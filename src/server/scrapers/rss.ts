/**
 * Tiny RSS/Atom parser. We avoid heavy deps; for our needs (titles + URLs +
 * pub dates), a regex-based extraction is sufficient and dependency-free.
 *
 * Supported feeds (trusted scene sources):
 *   - blabbermouth.net
 *   - metalinjection.net
 *   - nocleansinging.com
 *   - invisibleoranges.com
 *   - cvltnation.com
 */

export interface RssItem {
  title: string;
  link: string;
  pubDate: Date | null;
  description: string;
  source: string;
}

const FEEDS: { name: string; url: string }[] = [
  { name: "Blabbermouth", url: "https://www.blabbermouth.net/feed/" },
  { name: "Metal Injection", url: "https://metalinjection.net/feed" },
  { name: "No Clean Singing", url: "https://www.nocleansinging.com/feed/" },
  { name: "Invisible Oranges", url: "https://www.invisibleoranges.com/feed/" },
  { name: "CVLT Nation", url: "https://cvltnation.com/feed/" },
];

export function listFeeds() {
  return FEEDS.slice();
}

function extract(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  if (!m) return "";
  return m[1].replace(/<!\[CDATA\[|\]\]>/g, "").trim();
}

function parseDate(s: string): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function fetchFeed(name: string, url: string): Promise<RssItem[]> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "UndergroundMetal/0.1 (+https://undergroundmetal.app)",
      Accept: "application/rss+xml, application/xml, text/xml",
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
  const xml = await res.text();

  const items: RssItem[] = [];
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  for (const m of xml.matchAll(itemRegex)) {
    const block = m[1];
    items.push({
      title: extract(block, "title"),
      link: extract(block, "link"),
      pubDate: parseDate(extract(block, "pubDate") || extract(block, "dc:date")),
      description: extract(block, "description"),
      source: name,
    });
  }
  return items;
}
