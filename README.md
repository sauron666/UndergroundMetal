# Underground Metal

> AI-orchestrated discovery, encyclopedia, concerts, and editorial platform
> for rock and metal fans — with a deliberate bias toward the underground end
> of the spectrum, and dedicated support for the Bulgarian scene.

[![Built with Next.js](https://img.shields.io/badge/Next.js-15.5-000)](https://nextjs.org)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748)](https://www.prisma.io)
[![Tests](https://img.shields.io/badge/tests-84%20unit%20%2B%20E2E-success)](#testing)
[![License](https://img.shields.io/badge/license-MIT-8b0000)](LICENSE)

---

## What it does

| Pillar          | What |
|-----------------|------|
| **AI Discovery**  | Free-form query → mainstream + underground band tiers, every result carries a verifiable source. Cached. |
| **Encyclopedia**  | Cross-referenced bands, genres, members, releases. Postgres FTS + trigram fuzzy match. Bulgarian archive. |
| **Concerts**      | Geo-filtered listings, map view, iCal feeds, affiliate-linked tickets (Ticketpro / Eventim / DICE / See Tickets). |
| **Editorial**     | Articles with mandatory citations. AI fact-check first pass + human editor sign-off. archive.org snapshot of every cited URL. |
| **Community**     | Auth (password / OAuth / magic-link / TOTP 2FA), follows, bookmarks, comments with voting + thread collapse, DMs, forum. |
| **Realtime**      | SSE notifications, Web Push concert alerts (VAPID). |
| **i18n**          | Cookie-based locale, full dictionaries for EN / BG (others stubbed: DE / RU / PL / RO / EL). |
| **Monetization**  | Stripe subscriptions (Premium tier disables ads + raises rate limits) + tasteful ads + affiliate click attribution. |

---

## Table of contents

1. [Prerequisites](#prerequisites)
2. [Quick start (local dev)](#quick-start-local-dev)
3. [Environment variables](#environment-variables)
4. [Database setup](#database-setup)
5. [Running the app](#running-the-app)
6. [Testing](#testing)
7. [Background jobs & cron](#background-jobs--cron)
8. [Deployment](#deployment)
9. [Operations](#operations)
10. [Project layout](#project-layout)
11. [Architecture deep-dives](#architecture-deep-dives)

---

## Prerequisites

- **Node.js 22+** (LTS)
- **pnpm 10+** — `npm install -g pnpm`
- **Postgres 15+** — local or hosted (Supabase / Neon / Railway / RDS).
  The schema needs the `pg_trgm` and `unaccent` extensions; they're
  pre-installed on every managed provider.
- **Anthropic API key** for Discovery + Moderation flows
  ([console.anthropic.com](https://console.anthropic.com)).
- **Optional**: Stripe (payments), Resend (email), Voyage AI (embeddings),
  S3-compatible storage (R2 / S3 / B2) for image uploads, GitHub / Google
  OAuth apps.

---

## Quick start (local dev)

```bash
# 1. Clone + install
git clone https://github.com/sauron666/UndergroundMetal.git
cd UndergroundMetal
pnpm install

# 2. Configure env
cp .env.example .env
# Edit .env — at minimum:
#   DATABASE_URL  →  your Postgres URL
#   AUTH_SECRET   →  openssl rand -base64 32
#   ANTHROPIC_API_KEY → sk-ant-...

# 3. Initialise the database
pnpm db:migrate:deploy   # apply the two committed migrations
pnpm db:seed             # genres + ~30 starter bands + a couple of articles

# 4. Run the dev server
pnpm dev
```

Open <http://localhost:3000>. Sign up at `/auth/signup`, then promote yourself
to ADMIN via Prisma Studio:

```bash
pnpm db:studio
# In Studio → User table → set your row's `role` to ADMIN
```

---

## Environment variables

Every variable, what it does, and whether it's required, lives in
[`.env.example`](.env.example). The minimum to boot:

| Variable                | Required | Purpose |
|-------------------------|----------|---------|
| `DATABASE_URL`          | yes      | Pooled Postgres URL (PgBouncer for serverless). |
| `DIRECT_URL`            | yes      | Direct Postgres URL — used by `prisma migrate`. |
| `AUTH_SECRET`           | yes      | Session signing. `openssl rand -base64 32`. |
| `NEXT_PUBLIC_APP_URL`   | yes      | Public origin (`http://localhost:3000` in dev). |
| `ANTHROPIC_API_KEY`     | yes      | Claude API. Without it `/discover` returns 503. |
| `MUSICBRAINZ_USER_AGENT`| yes      | Required by MusicBrainz ToS — set to your contact. |

Optional but recommended for prod:

| Variable                | Purpose |
|-------------------------|---------|
| `AUTH_GITHUB_ID/SECRET`, `AUTH_GOOGLE_ID/SECRET` | OAuth signin |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PREMIUM_MONTHLY/YEARLY` | Premium tier |
| `RESEND_API_KEY`, `RESEND_FROM` | Magic-link signin + digests |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Web Push (`pnpm exec web-push generate-vapid-keys`) |
| `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_URL` | Image uploads |
| `VOYAGE_API_KEY`        | Real embeddings (falls back to a Claude pseudo-embedding without it) |
| `SENTRY_DSN`            | Error tracking — `instrumentation.ts` auto-wires the optional `@sentry/nextjs` SDK |
| `MAINTENANCE_MODE=1`    | Operator kill-switch — middleware 503s every page except `/api/health` |
| `DISCOVERY_DISABLED=1`  | Operator kill-switch — `/api/discover` returns 503 fast (use during Anthropic outages) |

---

## Database setup

### Local Postgres

```bash
# macOS
brew install postgresql@16 && brew services start postgresql@16
createdb undergroundmetal

# Linux
sudo -u postgres createdb undergroundmetal
```

Set:

```env
DATABASE_URL="postgresql://localhost:5432/undergroundmetal?schema=public"
DIRECT_URL="postgresql://localhost:5432/undergroundmetal?schema=public"
```

### Hosted (Supabase example)

```env
DATABASE_URL="postgresql://...@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://...@db.<project>.supabase.co:5432/postgres"
```

The pooled URL is for runtime; the direct URL is for migrations.
See [`DEPLOY.md`](DEPLOY.md) for Neon / Railway / self-hosted.

### Apply schema

```bash
pnpm db:migrate:deploy   # production-style — applies committed migrations
# or
pnpm db:migrate          # dev — generates a new migration when schema changes
```

### Seed

```bash
pnpm db:seed
```

Creates genre taxonomy + ~30 starter bands across the spectrum, plus a couple
of demo articles so the home page isn't empty.

---

## Running the app

| Command                | What |
|------------------------|------|
| `pnpm dev`             | Dev server with HMR at :3000 |
| `pnpm build`           | Production build (also runs `prisma generate`) |
| `pnpm start`           | Run the built app |
| `pnpm lint`            | ESLint |
| `pnpm typecheck`       | `tsc --noEmit` |
| `pnpm db:studio`       | Prisma Studio at :5555 |
| `pnpm worker`          | Background job loop (in a separate terminal) |
| `pnpm worker:once`     | Drain the job queue then exit |
| `pnpm scrape:news`     | One-shot RSS news ingestion |
| `pnpm scrape:concerts` | One-shot Bandsintown concert pull |
| `pnpm digest:send`     | Send today's email digest |
| `pnpm embeddings:backfill` | Compute missing band embeddings |

---

## Testing

```bash
pnpm test:unit          # vitest, 84 cases, ~3s
pnpm test:unit:watch    # watch mode
pnpm test:e2e           # Playwright — needs a running dev server + DB
pnpm perf:budget        # checks shared bundle ≤ 360 kB
```

Playwright project layout:

- `anon` — unauthenticated specs (smoke, discovery, auth flows)
- `setup-auth` — signs in once as reader + admin and persists `tests/e2e/.auth/*.json`
- `reader` — signed-in specs that reuse the cached storage state

Load test (requires [k6](https://k6.io)):

```bash
k6 run -e BASE_URL=https://staging.undergroundmetal.example scripts/load-discover.k6.js
```

---

## Background jobs & cron

The platform runs a queue out of the `Job` table with atomic claiming
(`SELECT … FOR UPDATE SKIP LOCKED`) and exponential backoff (1m → 16m,
5 attempts). Handlers:

| Job type           | What |
|--------------------|------|
| `ARCHIVE_CITATION` | Snapshot a URL to archive.org |
| `RECHECK_CITATION` | Re-validate every 90 days |
| `EMBED_BAND`       | Compute the Voyage embedding |
| `SEND_PUSH`        | Web Push to a single subscription |
| `REINDEX_SEARCH`   | Refresh tsvector |

Run a worker process:

```bash
pnpm worker
```

Recommended schedule (Vercel Cron / your scheduler of choice):

| Cron              | Job                  |
|-------------------|----------------------|
| `0 */6 * * *`     | `pnpm scrape:news`   |
| `0 3 * * *`       | `pnpm scrape:concerts` |
| `0 8 * * 1`       | `pnpm digest:send`   |
| `*/5 * * * *`     | `pnpm worker:once`   |

---

## Deployment

Full step-by-step (Vercel + Supabase + Stripe + Resend + R2) lives in
[`DEPLOY.md`](DEPLOY.md). Condensed checklist:

1. **Provision Postgres** (Supabase / Neon / Railway). Note the pooled +
   direct URLs.
2. **Generate secrets**:
   ```bash
   openssl rand -base64 32        # AUTH_SECRET
   pnpm exec web-push generate-vapid-keys   # VAPID_*
   ```
3. **Vercel** (or Fly / Railway):
   - Import the repo, set every env var from `.env.example`.
   - Build command: `prisma generate && prisma migrate deploy && next build`
   - Output: standard Next.js.
4. **Stripe**: create the two prices, register the webhook at
   `https://<domain>/api/billing/webhook` with signing secret →
   `STRIPE_WEBHOOK_SECRET`. The handler is idempotent (a unique PK on
   `event.id`), so replays are safe.
5. **DNS + TLS**: point your domain at the platform. CSP `report-uri`
   posts to `/api/csp-report` so violations surface in the observability
   hook (Sentry when wired).
6. **Cron**: register the schedules above.
7. **Sentry (optional)**: add `@sentry/nextjs` to dependencies and set
   `SENTRY_DSN`. `src/instrumentation.ts` auto-loads
   `src/lib/observability-sentry.ts` when the DSN is present.
8. **Edit `public/.well-known/security.txt`**: replace the placeholders
   with your real disclosure address before launch.

### CI

`.github/workflows/ci.yml` runs on every push + PR:

- **static**: typecheck, lint, build, perf-budget, `pnpm audit --prod
  --audit-level high` (blocks merges with high/critical CVEs)
- **unit**: vitest
- **e2e**: Playwright against a fresh Postgres service

Lighthouse CI (`.github/workflows/lighthouse.yml`) asserts the score
budget on PR previews.

---

## Operations

[`RUNBOOK.md`](RUNBOOK.md) is the on-call playbook — covers:

- Health probe failures
- Anthropic outages (use `DISCOVERY_DISABLED=1`)
- Stripe webhook drops (replay-safe)
- Comment / forum spam floods
- Image upload failures
- NextAuth signin loops
- SSE notification stalls
- Rollback procedure
- Weekly pre-incident checklist

Health endpoint: `GET /api/health` returns DB latency, uptime, build SHA,
maintenance flag.

---

## Project layout

```
src/
├── app/                    # Next.js App Router
│   ├── api/                # route handlers (discover, articles, billing,
│   │                       #  notifications/stream, csp-report, health, …)
│   ├── admin/              # editor + admin dashboards (analytics, ads,
│   │                       #  applications, festivals, tours)
│   ├── auth/               # signin / signup / magic-link / 2FA
│   ├── bands/, concerts/, articles/, festivals/, forum/, lists/, …
│   ├── sitemap.xml/        # multi-file sitemap index
│   ├── sitemaps/           # per-section paginated urlsets
│   ├── error.tsx           # page-level error boundary
│   └── global-error.tsx    # last-resort boundary (root layout crashes)
├── components/
│   ├── ui/                 # base primitives
│   ├── site/               # header, footer, ad slots
│   └── articles/, bands/, …
├── lib/                    # db, env, observability, sitemap-xml, …
├── server/
│   ├── ai/                 # Anthropic client + discovery + moderation
│   ├── sources/            # MusicBrainz / Metal Archives bridges
│   ├── scrapers/           # RSS news + Bandsintown concerts
│   ├── jobs/               # queue worker + handlers
│   ├── stripe.ts, security/, …
├── i18n/                   # locale dictionaries
├── auth.ts                 # NextAuth v5 config
├── instrumentation.ts      # auto-wires Sentry when SENTRY_DSN is set
└── middleware.ts           # MAINTENANCE_MODE kill-switch
prisma/
├── schema.prisma           # full data model
├── migrations/             # 0000_init, 0001_fts_and_jobs, 0002_stripe_webhook_events
└── seed.ts
scripts/
├── check-bundle-budget.mjs
├── backup-verify.sh        # restore-drill helper
└── load-discover.k6.js     # k6 load test
tests/
├── unit/                   # 84 vitest cases
└── e2e/                    # Playwright with cached storage state
```

---

## Architecture deep-dives

| Doc                              | What |
|----------------------------------|------|
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Technical walkthrough — data model, AI flows, search, jobs |
| [`DEPLOY.md`](DEPLOY.md)             | Production deploy checklist (Vercel + Supabase + Stripe) |
| [`RUNBOOK.md`](RUNBOOK.md)           | On-call playbook |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | How to add bands, articles, code |

---

## Stack at a glance

- **Frontend**: Next.js 15.5 (App Router, RSC), React 19, Tailwind CSS,
  shadcn-style primitives, TipTap editor, Leaflet for the concerts map.
- **Auth**: NextAuth v5 — credentials + GitHub + Google + magic-link + TOTP 2FA.
- **DB**: Postgres 15+ + Prisma 6 (pg_trgm, unaccent, tsvector).
- **AI**: Anthropic Claude — Opus 4.7 (discovery), Haiku 4.5 (moderation).
- **Embeddings**: Voyage AI (with Claude pseudo-embedding fallback).
- **Payments**: Stripe subscriptions (idempotent webhook).
- **Email**: Resend (magic-link + digests).
- **Storage**: S3-compatible (R2 / S3 / B2).
- **Realtime**: SSE for notifications, Web Push (VAPID) for concert alerts.
- **Observability**: vendor-neutral hook with optional `@sentry/nextjs` adapter.
- **Hosting**: Vercel + Supabase / Neon recommended; runs anywhere Node 22 runs.

---

## License

MIT. Built by metalheads, for metalheads.
