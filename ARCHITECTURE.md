# Architecture

## High-level

```
                      ┌──────────────────────────────────────┐
                      │            Next.js (App Router)      │
                      │                                      │
   Browser ─────────► │  RSC pages  ◄── server actions       │
                      │  Client     ─── /api/* route handlers│
                      └────────┬──────────┬──────────────────┘
                               │          │
                               ▼          ▼
                  ┌──────────────────┐  ┌────────────────────┐
                  │   Postgres       │  │   Anthropic API    │
                  │   (Prisma)       │  │   Claude Opus +    │
                  │                  │  │   Claude Haiku     │
                  └──────────────────┘  └────────────────────┘
                               ▲
                               │
                  ┌──────────────────────────┐
                  │  Scraping workers (tsx)  │
                  │  - RSS news              │
                  │  - Bandsintown concerts  │
                  │  - MusicBrainz / MA refs │
                  └──────────────────────────┘
```

## Domain model

The schema (see `prisma/schema.prisma`) splits into six concerns:

| Concern | Models |
| --- | --- |
| Auth | `User`, `Account`, `Session`, `Subscription` |
| Music | `Band`, `Genre`, `Person`, `BandMember`, `Release`, `BandGenre` |
| Concerts | `Venue`, `Show`, `ShowBand`, `TicketLink` |
| Editorial | `Article`, `ArticleRevision`, `Citation`, `ArticleBand` |
| Community | `Comment`, `Vote`, `Follow`, `Bookmark`, `Report` |
| Pipeline / monetization | `ExternalSource`, `ScrapeRun`, `ModerationEvent`, `AffiliateClick`, `AdPlacement`, `DiscoveryQuery` |

### Why `DiscoveryQuery`?

LLM calls are expensive. We hash `(query + filters)` to dedupe identical
requests, then cache the parsed JSON result. Repeat searches are free and
instant. `hitCount` is incremented on every cache hit so we can later promote
high-traffic queries to permanent landing pages (SEO play).

### Why an `ExternalSource` table instead of FKs?

A band may have references in MusicBrainz, Metal Archives, Bandcamp, Spotify,
plus arbitrary "other" URLs. A polymorphic table keeps the schema small and
lets us re-sync from the original payload (`raw` JSON).

## AI orchestration

```
discover()
  ├── hash(query, filters)
  ├── DiscoveryQuery.findUnique(hash)
  │     ├─ HIT  → increment hitCount, return cached result
  │     └─ MISS → ↓
  ├── Anthropic.messages.create({
  │      model: claude-opus-4-7,
  │      system: [{ text: SYSTEM_PROMPT, cache_control: ephemeral }],
  │      messages: [{ role: user, content: prompt }]
  │   })
  ├── extract JSON from response (defensive, handles fenced code blocks)
  ├── Zod-validate against DiscoveryResultSchema
  ├── persist into DiscoveryQuery
  └── return result
        │
        ▼
attachLocalBands(result)
  - Bulk SELECT bands by name (case-insensitive)
  - Decorate suggestions with { local: { id, slug, ... } } when matched
  - UI hyperlinks known bands directly to /bands/<slug>
```

The system prompt is **prompt-cached** (`cache_control: ephemeral`). With
typical traffic this drops cost by ~90% on repeat calls within the cache TTL.

## Editorial pipeline

```
Author drafts article in TipTap
    │
    ▼
"AI check" button  ──► /api/moderate ──► Claude Haiku ──► structured findings
                                            │
                                            └─► persisted in ModerationEvent
    │
    ▼
"Submit for review" ──► Article.status = IN_REVIEW
    │
    ▼
Editor at /admin/moderation
    ├── inspect AI findings
    ├── verify citations (URLs reachable? archive.org snapshot?)
    └── APPROVE / CHANGES_REQUESTED / REJECT
        │
        ▼ (on APPROVE)
    Article.status = PUBLISHED
    Article.publishedAt = now()
    + URL archival job (TODO) snapshots citations to archive.org
```

## Affiliate click flow

```
User clicks ticket button
    │
    ▼
/api/click?id=<TicketLink.id>
    ├── lookup TicketLink
    ├── buildTicketUrl(provider, url, { userId, campaign })
    │     - appends provider-specific affiliate tag
    │     - appends utm_source / utm_medium / utm_campaign / utm_term
    ├── fire-and-forget AffiliateClick row (hashed IP for GDPR)
    └── 302 → tagged URL
```

Premium users *also* go through this so we can audit, but they don't see
ads anywhere on the site (`<AdSlot>` returns `null` for tier=PREMIUM).

## Scraping policies

Built-in defenses against ToS violation:

1. **MusicBrainz** — 1 req/sec floor enforced in `musicbrainz.ts`.
2. **Metal Archives** — only the search-resolve endpoint, 1 req / 2 sec, never
   page-scrape. We store an ID + URL, not content.
3. **RSS feeds** — public, identified User-Agent.
4. **Robots / sitemap** — `/robots.txt` disallows `/api/`, `/admin/`, `/auth/`.
   `/sitemap.xml` lists every band, article, and upcoming show.

Every run, success or failure, persists a `ScrapeRun` row.

## Performance considerations

- Public list pages (`/bands`, `/concerts`, `/articles`) are RSC and use
  Prisma `findMany` with capped `take`. Add Redis or a database index (already
  declared) when scaling.
- AI calls are cached via `DiscoveryQuery`.
- Stripe SDK is dynamically imported only when `STRIPE_SECRET_KEY` is set.
- Images go through `next/image`; remote hosts are explicitly allow-listed in
  `next.config.mjs`.

## Future work

- Full-text search via Postgres `tsvector` (we have the column, need the index).
- Background job runner (BullMQ + Redis) for archival, embedding generation,
  and concert sync.
- Embeddings for "more like this" band recommendations.
- WebPush concert alerts for followed bands (premium-only).
- i18n: BG / EN / DE.
- Mobile app (Expo) sharing the same API.
