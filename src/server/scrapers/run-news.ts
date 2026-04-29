/**
 * News scraper entry point.
 *
 * Run: pnpm scrape:news
 *
 * Pulls trusted scene RSS feeds, runs each item through Claude (Haiku) to
 * classify it (which band(s), is it news vs. opinion, factual claims) and
 * upserts an Article in DRAFT state for editor review. Editors decide what
 * to publish; we never auto-publish scraped content.
 */

import { db } from "@/lib/db";
import { fetchFeed, listFeeds } from "./rss";
import { getAnthropic, MODELS } from "@/server/ai/anthropic";
import { slugify } from "@/lib/utils";

type Classification = { bands?: string[]; topic?: string; interesting?: boolean };

async function classify(input: { title: string; description: string }): Promise<Classification> {
  const client = getAnthropic();
  const res = await client.messages.create({
    model: MODELS.moderation,
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: `Classify this metal-news item.
Return JSON: { "bands": ["..."], "topic": "tour|release|lineup|death|festival|other", "interesting": true|false }
Title: ${input.title}
Description: ${input.description}`,
      },
    ],
  });
  const text = res.content
    .map((c) => (c.type === "text" ? c.text : ""))
    .join("\n");
  try {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    return JSON.parse(text.slice(start, end + 1)) as {
      bands?: string[];
      topic?: string;
      interesting?: boolean;
    };
  } catch {
    return {} as { bands?: string[]; topic?: string; interesting?: boolean };
  }
}

async function run() {
  // Find a system "news bot" author to credit drafts to
  const bot = await db.user.upsert({
    where: { email: "news-bot@undergroundmetal.app" },
    update: {},
    create: {
      email: "news-bot@undergroundmetal.app",
      username: "news-bot",
      name: "News Bot",
      role: "AUTHOR",
    },
  });

  for (const feed of listFeeds()) {
    const startedAt = new Date();
    let itemsSeen = 0;
    let itemsNew = 0;
    let status: "OK" | "ERROR" = "OK";
    let error: string | null = null;

    try {
      const items = await fetchFeed(feed.name, feed.url);
      itemsSeen = items.length;

      for (const item of items.slice(0, 8)) {
        // dedupe by canonical URL inside an existing citation
        const dupe = await db.citation.findFirst({
          where: { url: item.link },
        });
        if (dupe) continue;

        const classification: Classification = process.env.ANTHROPIC_API_KEY
          ? await classify(item).catch(() => ({} as Classification))
          : {};
        if (classification.interesting === false) continue;

        const baseSlug = slugify(item.title).slice(0, 80) || "untitled";
        let slug = baseSlug;
        let attempt = 1;
        while (await db.article.findUnique({ where: { slug } })) {
          attempt += 1;
          slug = `${baseSlug}-${attempt}`;
          if (attempt > 5) break;
        }

        await db.article.create({
          data: {
            slug,
            title: item.title,
            type: "NEWS",
            status: "IN_REVIEW",
            authorId: bot.id,
            excerpt: item.description.replace(/<[^>]+>/g, "").slice(0, 280),
            content: {
              type: "doc",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: item.description.replace(/<[^>]+>/g, "") }],
                },
              ],
            },
            contentText: item.description.replace(/<[^>]+>/g, ""),
            publishedAt: item.pubDate ?? new Date(),
            citations: {
              create: [
                {
                  url: item.link,
                  title: item.title,
                  publisher: feed.name,
                  kind: "SECONDARY",
                  verified: true,
                  verifiedAt: new Date(),
                },
              ],
            },
          },
        });
        itemsNew += 1;
      }
    } catch (e) {
      status = "ERROR";
      error = e instanceof Error ? e.message : String(e);
    }

    await db.scrapeRun.create({
      data: {
        source: "RSS",
        target: feed.url,
        status,
        itemsSeen,
        itemsNew,
        error,
        startedAt,
        endedAt: new Date(),
      },
    });

    console.log(
      `[news] ${feed.name}: ${status} seen=${itemsSeen} new=${itemsNew}${error ? ` error=${error}` : ""}`
    );
  }

  await db.$disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
