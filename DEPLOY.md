# Deploy guide

Production-ready checklist + step-by-step for the most common stack
(Vercel + Supabase / Neon / Railway).

## 1. Database

You need Postgres 15+. The schema uses the `pg_trgm` and `unaccent` extensions
which are pre-installed on Supabase, Neon, Railway, RDS, and any modern
cluster.

### Connection pooling

Prisma's default pool can crush a serverless deployment because each cold
function instance opens its own connections. Use a pooler in front of Postgres.

**Supabase**: it ships with PgBouncer at port 6543. Set:

```
DATABASE_URL="postgresql://user:pass@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://user:pass@db.<project>.supabase.co:5432/postgres"
```

`DATABASE_URL` is the *runtime* URL — pgbouncer-fronted, transaction pooling,
`connection_limit=1` so each function instance only opens a single connection.
`DIRECT_URL` is the *migration* URL — direct to the primary, used by
`prisma migrate deploy` and any long-running script (`pnpm worker`).

**Neon**: similar — `pooler` subdomain for runtime, the bare hostname for
migrations.

**Self-hosted**: run PgBouncer locally (`pool_mode = transaction`,
`max_client_conn = 1000`, `default_pool_size = 20`) and put it on
`DATABASE_URL`.

### Migrations

Production deploys must run `prisma migrate deploy` *before* the app boots.
On Vercel that goes in the build command:

```
"build": "prisma generate && prisma migrate deploy && next build"
```

The repository ships with two migrations:
- `0000_init` — full schema baseline
- `0001_fts_and_jobs` — tsvector columns + GIN/trigram indexes

## 2. Environment

Copy `.env.example` and fill the variables grouped by area. Bare minimum:

| Variable | Used for |
| --- | --- |
| `DATABASE_URL` + `DIRECT_URL` | Database access |
| `AUTH_SECRET` | Session signing — `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL` | Site origin, used in OG / emails / sitemap |
| `ANTHROPIC_API_KEY` | AI Discovery + moderation + embeddings fallback |

Optional but expected for a public deploy:

- `RESEND_API_KEY` — email delivery
- `STRIPE_*` — Premium subscriptions
- `S3_*` + `NEXT_PUBLIC_S3_PUBLIC_URL` — image uploads
- `VAPID_*` — Web Push notifications
- `VOYAGE_API_KEY` — real embeddings (otherwise pseudo)
- `IMAGE_OPTIMIZE_PROVIDER=cloudflare` — image transform when CDN supports it

## 3. Background workers

The web process can't run the long-lived `pnpm worker` loop on Vercel — split
it into a separate deployment:

- **Vercel Cron** + a route handler that imports `tickScheduler()` and
  drains pending jobs (call hourly).
- Or a **Render / Fly / Railway** worker service running `pnpm worker`
  full-time.

Cron-style jobs (`digest.weekly`, `citations.recheck`, etc.) tick from inside
the worker every minute. If you only run `worker:once` from CI cron, ensure
the cron schedule covers the windows the scheduler checks (`9:00 UTC` Sunday
for the digest, `4:00 UTC` daily for citation re-checks).

## 4. Observability

`src/instrumentation.ts` is the place to wire Sentry / Bugsnag. Default
implementation logs structured JSON via `lib/logger.ts`. Sentry example:

```ts
// src/instrumentation.ts
import { setObservability } from "@/lib/observability";
export async function register() {
  if (!process.env.SENTRY_DSN) return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0.1 });
  setObservability({
    captureException: (err, ctx) =>
      Sentry.captureException(err, { extra: ctx ?? undefined }),
    captureEvent: (name, ctx) =>
      Sentry.captureMessage(name, { extra: ctx ?? undefined }),
  });
}
```

Health endpoint at `/api/health` — point your platform's liveness probe here.
It returns 200 only when Postgres is reachable.

## 5. Security headers

`next.config.mjs` ships with strict CSP, HSTS (prod only), X-Frame-Options,
nosniff, Referrer-Policy, Permissions-Policy. Audit the CSP `connect-src`
list when you add new outbound services.

## 6. Rate limits

DB-backed token bucket (`RateLimitBucket`). Tuned defaults:

- `/api/discover` — 10/h anon, 60/h free, 240/h premium
- `/api/auth/precheck` — 20 / IP / 10 min
- `/api/auth/magic/start` — 5 / IP / 10 min (returns 200 always)
- `/api/newsletter/subscribe` — 10 / IP / hour
- DM send — 30 / user / 10 min

For higher traffic move the bucket logic to a Redis Lua script — same
contract.

## 7. Image storage

S3-compatible: AWS S3, Cloudflare R2, Backblaze B2 all work.
`src/server/storage/s3.ts` uses the AWS SDK with `forcePathStyle` enabled for
non-AWS endpoints.

For R2 specifically:
- Create the bucket, set CORS to allow `PUT` from your domain.
- Set `S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com`.
- Set `NEXT_PUBLIC_S3_PUBLIC_URL` to the public domain (custom domain or
  `<bucket>.<account>.r2.dev`).

## 8. Monitoring

The CI workflow runs typecheck + lint + build + vitest + playwright.
Production deployments should additionally watch:

- Application logs (look for `level: "error"`)
- Postgres slow query log
- Stripe webhook delivery (the `/api/billing/webhook` route)
- AffiliateClick volume — sudden drops indicate broken outbound URLs
- ScrapeRun rows with status != OK

## 9. Backups

Whichever Postgres you pick, enable point-in-time recovery + nightly logical
backups. The schema is small (`prisma migrate diff` produces ~1.4k lines of
DDL); restoring is not the slow path — re-embedding the band catalogue
through Voyage/Anthropic is. Keep a periodic export of `BandEmbedding` rows
on object storage so disaster recovery doesn't burn the LLM budget twice.

### Verification drill

A backup that hasn't been restored is a hope, not a backup. Use
`scripts/backup-verify.sh` weekly:

```bash
SOURCE_DATABASE_URL=postgres://ro@db/prod \
SCRATCH_DATABASE_URL=postgres://admin@db/scratch \
  ./scripts/backup-verify.sh
```

It does a full `pg_dump` of the production-style URL, restores into a
scratch DB, then runs `prisma migrate status` against the result. Exit
code 0 confirms both that the dump is valid and that the migration
history matches the live schema.

Schedule it as a Render cron job, GitHub Actions workflow, or a
once-a-week k8s CronJob. Alert when it fails — that's the early signal
your backup pipeline is broken.
