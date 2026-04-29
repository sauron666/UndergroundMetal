# Contributing

Thanks for considering a contribution. Three ways to help:

## 1. Add bands

The fastest way is to use the AI Discovery flow on the live site, then click
"Import to library" on a band you want catalogued (admin-gated). Programmatic
ingestion is in `src/server/sources/index.ts` — it pulls from MusicBrainz,
resolves the Metal Archives ID, and upserts a `Band` record.

For Bulgarian / Balkan acts that may not have MusicBrainz entries:

1. Open a PR adding to `prisma/seed.ts` under the `BANDS` array.
2. Verify the band exists on Metal Archives or has a Bandcamp page.
3. Set realistic `undergroundScore` (1 = stadium, 10 = unfindable) and
   `heaviness` (1 = soft rock, 10 = noisecore extremes).

## 2. Write articles

Sign up, request the AUTHOR role from a maintainer, then pitch via
`/articles/new`. Editorial standards:

- **Every factual claim has a source.** "Mayhem formed in 1984" needs a
  citation. "Mayhem's *De Mysteriis Dom Sathanas* is a masterpiece" does not.
- **Primary sources beat secondary.** Band/label pages, official statements,
  first-hand interviews you conducted, archival material. Press recaps come
  last.
- **No NSBM platforming.** Critical coverage of NSBM bands is fine; promo
  copy is not.
- **AI fact-check before submission.** Use the "AI check" button — it lists
  uncited claims and missing sources for you to fix.

## 3. Code

- TypeScript strict, no `any` without comment.
- Prefer RSC + server actions over client-side fetches when possible.
- Keep components small. UI primitives in `src/components/ui/` mirror shadcn
  conventions.
- For DB changes, edit `prisma/schema.prisma` and run `pnpm db:push` (dev) or
  `pnpm db:migrate` (with migration history).
- Run `pnpm typecheck && pnpm lint` before opening a PR.

### Branch + PR conventions

- Branch off `main`.
- One PR per concern. Don't bundle a refactor with a feature.
- Describe the **why**, not the what.

## Code of conduct

Be excellent. Sectarian gatekeeping ("real metal" arguments) is fine in the
articles, not in PRs. No racist, sexist, or homophobic shit — the genre has
enough of that already.
