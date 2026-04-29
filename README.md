# Underground Metal

> AI-orchestrated discovery, encyclopedia, concerts, and editorial platform for rock and metal fans — with a deliberate bias toward the underground end of the spectrum.

[![Built with Next.js](https://img.shields.io/badge/Next.js-15-000)](https://nextjs.org)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748)](https://www.prisma.io)
[![License](https://img.shields.io/badge/license-MIT-8b0000)](LICENSE)

## What it does

| Pillar | What |
| --- | --- |
| **AI Discovery** | Free-form query → mainstream + underground band tiers, with verifiable sources. Cached. |
| **Encyclopedia** | Cross-referenced bands, genres, members, releases. Dedicated Bulgarian archive. |
| **Concerts** | Geo-filtered listings with affiliate links to Ticketpro / Eventim / DICE / See Tickets. |
| **Editorial** | Articles with mandatory citations. AI fact-check first pass + editor sign-off. |
| **Community** | Auth, follows, bookmarks, reports, comments. |
| **Monetization** | Premium tier (Stripe) + tasteful ads + affiliate click attribution. |

## Quick start

```bash
# 1. Install deps
pnpm install

# 2. Set up env
cp .env.example .env
# Fill in DATABASE_URL, AUTH_SECRET (openssl rand -base64 32), ANTHROPIC_API_KEY

# 3. Set up the database
pnpm db:push           # apply schema
pnpm db:seed           # seed genres + ~30 bands

# 4. Run
pnpm dev
```

Open <http://localhost:3000>.

## Project layout

```
src/
├── app/                    # Next.js App Router
│   ├── api/                # route handlers
│   │   ├── discover/       # AI discovery endpoint
│   │   ├── articles/       # CRUD
│   │   ├── moderate/       # AI moderation
│   │   ├── click/          # affiliate click tracker
│   │   ├── billing/        # Stripe checkout + webhook
│   │   └── auth/           # NextAuth
│   ├── admin/              # editor + admin dashboards
│   ├── auth/               # signin / signup
│   ├── bands/, concerts/, articles/, bg-archive/
│   └── premium/, search/, about/
├── components/
│   ├── ui/                 # base primitives (Button, Card, Input, ...)
│   └── site/               # site-wide chrome (header, footer, ad slots)
├── lib/                    # db, env, utils
├── server/
│   ├── ai/                 # Anthropic client + discovery + moderation orchestrators
│   ├── sources/            # MusicBrainz + Metal Archives bridges + ingestion
│   ├── scrapers/           # RSS news + Bandsintown concerts
│   ├── affiliate.ts        # outbound URL builder
│   └── stripe.ts           # lazy Stripe client
└── auth.ts                 # NextAuth v5 config

prisma/
├── schema.prisma           # full data model
└── seed.ts                 # initial dataset
```

## Stack

- **Frontend**: Next.js 15 (App Router, RSC), React 19, Tailwind CSS, shadcn-style primitives, TipTap editor
- **Auth**: NextAuth v5 (credentials + GitHub + Google)
- **DB**: Postgres + Prisma
- **AI**: Anthropic Claude (Opus 4.7 for discovery, Haiku 4.5 for moderation)
- **Payments**: Stripe (subscriptions)
- **Hosting**: Vercel + Supabase / Neon (recommended)

## AI orchestration

Two distinct flows, both in `src/server/ai/`:

### Discovery (`discovery.ts`)
1. User submits free-form query + optional filters (country, era, heaviness).
2. We hash the request and check the `DiscoveryQuery` cache.
3. On miss, call Claude (Opus, with cached system prompt) and parse a
   structured JSON response with Zod.
4. Each suggestion includes ≥1 verifiable external reference (Metal Archives,
   MusicBrainz, Bandcamp, Wikipedia).
5. We cross-reference suggestion names with our local `Band` table so the UI
   can hyperlink known bands directly.

### Moderation (`moderation.ts`)
- Run on every article submission and re-runnable from the editor UI.
- Claude (Haiku for cost) returns: factual claims needing sources, missing
  citations, quality issues, toxicity score, and a verdict.
- Findings are persisted to `ModerationEvent` for audit.

## Data ingestion

- **MusicBrainz** — open data (CC0). No API key, but a custom User-Agent is
  required and we throttle to 1 req/sec per ToS.
- **Metal Archives** — we resolve a band name to its public numeric ID only.
  We do not scrape page content. Outbound links are attributed.
- **Bandsintown** — public artist endpoint, 600 ms gap between bands.
- **RSS news** — scene-trusted feeds (Blabbermouth, Metal Injection, No Clean
  Singing, Invisible Oranges, CVLT Nation). Scraped items arrive as
  `Article(IN_REVIEW)` for editor approval — never auto-published.

Every run is logged to `ScrapeRun` for transparency.

## Affiliate / monetization

- Outbound ticket clicks go through `/api/click?id=<TicketLink id>`. We log a
  hashed-IP audit row in `AffiliateClick`, then 302 to the affiliate-tagged URL.
- `buildTicketUrl()` appends provider-specific affiliate tags + UTM parameters.
- **Real revenue** requires registering for each vendor's affiliate program
  (Ticketpro, Eventim, See Tickets, Ticketmaster Impact Radius).

Premium tier is a standard Stripe subscription. The webhook flips
`User.tier = PREMIUM` and `<AdSlot>` becomes a no-op for that user.

## Deployment

1. **Database**: provision Postgres (Supabase / Neon / Railway). Set
   `DATABASE_URL` and `DIRECT_URL`.
2. **Vercel**: set every variable from `.env.example`. The build command
   `pnpm build` runs `prisma generate` automatically.
3. **Cron** (for scrapers):
   - News: `0 */6 * * *` → `pnpm scrape:news`
   - Concerts: `0 3 * * *` → `pnpm scrape:concerts`
4. **Stripe**: create the two prices, paste their IDs into env, register the
   webhook at `/api/billing/webhook` with the secret.

## Roles

- **READER** (default): browse, follow, bookmark, comment.
- **AUTHOR**: pitch articles. Submitted pieces go through AI + editor review.
- **EDITOR**: access `/admin/moderation`, approve / reject articles.
- **ADMIN**: full access including ad placements.

## Editorial guarantees

- Every factual claim must be cited.
- AI flags uncited claims before an editor sees the piece.
- Authorship is publicly attributed; revisions are kept in `ArticleRevision`.
- URL archival to archive.org on publication is planned (background job).

## Phase 2 features (added on top of the foundation)

- **Background job queue** (`Job` model + `pnpm worker`). Atomic claim via
  `SELECT ... FOR UPDATE SKIP LOCKED`. Handlers: `ARCHIVE_CITATION`,
  `RECHECK_CITATION`, `EMBED_BAND`, `SEND_PUSH`, `REINDEX_SEARCH`. Exponential
  backoff on failure (1m → 16m, 5 attempts).
- **archive.org snapshot** of every citation on article publish. The
  `Citation.archiveUrl` is shown next to the live link, surviving link rot.
- **Postgres full-text search** (tsvector + GIN + pg_trgm fallback). The
  `/search` page ranks bands, articles, and shows together. Typos forgiven via
  trigram similarity. See `prisma/migrations/0001_fts_and_jobs/migration.sql`.
- **Similar bands** hybrid recommender: cosine similarity over `BandEmbedding`
  vectors plus Jaccard overlap on genres + themes plus heaviness/underground
  proximity. Reasons surfaced in the UI ("genre", "scene", "themes").
- **Web Push concert alerts**. Service worker at `/sw.js`, VAPID-signed
  notifications via `web-push`. Followers get a push when a new show is added
  to their followed band. Toggle via `<PushToggle>` on band pages.
- **i18n EN/BG**. Cookie-based locale (`um.locale`), no URL restructuring,
  full Bulgarian dictionary in `src/i18n/dictionaries/bg.ts`. `<LocaleSwitcher>`
  in the header.
- **Editor moderation actions** at `PATCH /api/admin/articles/:id` (publish /
  request_changes / reject) — wires into `publishArticle()` which enqueues
  archival + push jobs.

## See also

- [`ARCHITECTURE.md`](ARCHITECTURE.md) — deeper technical walkthrough
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — how to add bands, articles, code

## License

MIT. Built by metalheads, for metalheads.
