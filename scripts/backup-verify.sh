#!/usr/bin/env bash
#
# Backup verification drill.
#
# Takes a logical pg_dump of a production-style URL into a scratch DB,
# applies all migrations, and runs `prisma migrate status` against it.
# Exit code 0 = restore succeeded and schema is up to date.
#
# Run periodically (weekly cron, or before every release) so you find out
# the backup is broken *before* you need it.
#
# Required env:
#   SOURCE_DATABASE_URL   pg_dump source (read-only role recommended)
#   SCRATCH_DATABASE_URL  empty target DB; gets dropped + recreated
#
# Optional:
#   PG_DUMP_BIN           override path to pg_dump (default: pg_dump)
#   PSQL_BIN              override path to psql    (default: psql)
#
# Example:
#   SOURCE_DATABASE_URL=postgres://ro@db/prod \
#   SCRATCH_DATABASE_URL=postgres://admin@db/scratch \
#   ./scripts/backup-verify.sh

set -euo pipefail

: "${SOURCE_DATABASE_URL:?missing SOURCE_DATABASE_URL}"
: "${SCRATCH_DATABASE_URL:?missing SCRATCH_DATABASE_URL}"

PG_DUMP_BIN=${PG_DUMP_BIN:-pg_dump}
PSQL_BIN=${PSQL_BIN:-psql}

DUMP_FILE=$(mktemp /tmp/um-backup.XXXXXX.sql)
trap 'rm -f "$DUMP_FILE"' EXIT

echo "[backup-verify] dumping production-style URL..."
"$PG_DUMP_BIN" --no-owner --no-acl --clean --if-exists \
  --dbname="$SOURCE_DATABASE_URL" \
  > "$DUMP_FILE"

echo "[backup-verify] dump size: $(wc -c < "$DUMP_FILE") bytes"

echo "[backup-verify] reset scratch DB..."
"$PSQL_BIN" "$SCRATCH_DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
SQL

echo "[backup-verify] restore..."
"$PSQL_BIN" "$SCRATCH_DATABASE_URL" -v ON_ERROR_STOP=1 -f "$DUMP_FILE"

echo "[backup-verify] verify schema with prisma migrate status..."
DATABASE_URL="$SCRATCH_DATABASE_URL" \
DIRECT_URL="$SCRATCH_DATABASE_URL" \
  pnpm exec prisma migrate status

echo "[backup-verify] OK"
