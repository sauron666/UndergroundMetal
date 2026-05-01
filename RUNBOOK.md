# On-Call Runbook

Operational playbook for the Underground Metal platform. Keep this short
and skimmable — when you're paged at 03:00 you don't want to read prose.

## Quick links

- Health probe: `GET /api/health`
- Metrics (if Sentry wired): https://sentry.io/organizations/<org>/projects/undergroundmetal
- DB console: `psql $DATABASE_URL`
- Logs: platform-specific (Vercel, Fly, Railway, etc.)

## Severity levels

| Sev | Definition                                            | Response |
|-----|-------------------------------------------------------|----------|
| S1  | Site down, signin broken, payments failing            | Page on-call immediately |
| S2  | Major feature broken (discovery, articles, comments)  | Within 1h |
| S3  | Cosmetic, single page, low-traffic feature            | Next business day |

## Common incidents

### 1. Health check failing (`/api/health` 5xx)

Likely DB connectivity. Steps:
1. `psql $DATABASE_URL -c "select 1"` — confirms DB reachable.
2. Check connection pool exhaustion in DB logs (`too many connections`).
3. If pool exhausted: bump `connection_limit` in `DATABASE_URL` query string,
   or scale up the DB.
4. If DB unreachable: failover to read-replica if configured; otherwise
   announce maintenance window.

### 2. Discovery endpoint returning 5xx

Anthropic outage, malformed model output, or rate-limit exhaustion.
1. Check Anthropic status: https://status.anthropic.com
2. Inspect logs for `did not return JSON` — model is drifting; the schema
   guard in `src/server/ai/discovery.ts` should already 500 cleanly.
3. Check DB: `select count(*) from "DiscoveryQuery" where "createdAt" > now() - interval '5 min'`.
   Spike + 5xx = upstream incident.
4. Mitigation: feature-flag discovery off via env `DISCOVERY_DISABLED=1`
   (the route reads this and 503s with a friendly message).

### 3. Stripe webhook drops

Subscription state diverges from Stripe.
1. Replay missed events: Stripe Dashboard → Developers → Webhooks → select
   endpoint → Send test event or "Resend".
2. The endpoint is idempotent (`StripeWebhookEvent` PK on event.id) so
   replay is safe.
3. Reconcile manually: `stripe customers list --limit 100 | jq` and
   compare with `select "stripeCustomerId", tier from "User"`.

### 4. Comment/forum spam flood

Token-bucket limiter (`RateLimitBucket`) tightens automatically, but if
abuse persists:
1. Identify offending users: `select "userId", count(*) from "Comment"
   where "createdAt" > now() - interval '1 hour' group by 1 order by 2 desc limit 20`.
2. Hide their content in bulk:
   `update "Comment" set "hidden" = true where "userId" = '<id>'
    and "createdAt" > now() - interval '24 hour'`.
3. Demote the role to revoke posting / authoring rights:
   `update "User" set "role" = 'READER' where id = '<id>'` (or pause
   the account entirely with a one-off email-suspension flag once that
   ships). The rate-limit bucket also accepts a manual entry to lock the
   user out for N hours: insert with `key = 'user:<id>:comment'`,
   `tokens = 0`, `refillPerSec = 0`.

### 5. Image upload failures

Likely S3/R2 misconfig.
1. Check presign endpoint `POST /api/uploads/presign` returns 200.
2. Verify env vars: `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`,
   `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_URL`.
3. Test with `aws s3 ls s3://$S3_BUCKET --endpoint-url $S3_ENDPOINT`.

### 6. NextAuth signin loop

Usually session cookie domain mismatch or `NEXTAUTH_URL` wrong.
1. Confirm `NEXTAUTH_URL` matches the public host exactly (incl. https).
2. Confirm `NEXTAUTH_SECRET` is set and not rotated since last deploy
   (rotating it invalidates all sessions — this is intentional during
   incident response if credentials are leaked).

### 7. SSE notifications stream stalling

`/api/notifications/stream` keeps connections open; load balancers may
time them out.
1. Confirm reverse proxy `proxy_read_timeout` ≥ 60s.
2. Heartbeats are sent every 25s; if missing, the route deployed broken.
3. Client auto-reconnects with exponential backoff — short blips are OK.

## Deploy / rollback

- Deploy: push to main, CI runs `pnpm typecheck && pnpm test:unit
  && pnpm build && pnpm perf:budget`. Failures block.
- Rollback: redeploy the previous commit from the platform UI. DB
  migrations are forward-only — if a migration is bad, restore from the
  hourly snapshot (`scripts/backup-verify.sh`).

## Pre-incident checklist (weekly)

- [ ] Backup verify ran in CI within 24h
- [ ] Lighthouse CI under thresholds
- [ ] Bundle budget under 360 kB shared
- [ ] No unresolved Sentry issues with > 100 events
- [ ] Stripe webhook delivery success rate > 99%

## Contact

Update this section with your team's actual paging info before going
live.

- Primary on-call: TBD
- Secondary: TBD
- Anthropic support (paid tier): support@anthropic.com
- Stripe support: dashboard chat
