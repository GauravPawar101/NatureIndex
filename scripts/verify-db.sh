#!/usr/bin/env bash
#
# Rehearses the whole database locally: fixture -> schema -> seed -> assertions.
#
# Everything runs inside a throwaway pgvector container, so nothing here needs
# Supabase credentials, a local Postgres install, or network access to a real
# project. This is the same command CI runs.
#
#   ./scripts/verify-db.sh
#
# Env:
#   KEEP_CONTAINER=1   leave the container up afterwards for inspection
#   CONTAINER_NAME     override the container name (default nature-index-verify)
#   PGPORT             override the host port (default 55433)

set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTAINER_NAME="${CONTAINER_NAME:-nature-index-verify}"
PGPORT="${PGPORT:-55433}"
PGUSER=postgres
PGPASSWORD=nipass
PGDATABASE=natureindex
IMAGE="pgvector/pgvector:pg16"

if ! command -v docker >/dev/null 2>&1; then
  echo "error: docker is required to run the database verification" >&2
  exit 1
fi

cleanup() {
  local status=$?
  if [ "${KEEP_CONTAINER:-0}" != "1" ]; then
    docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
  else
    echo "container ${CONTAINER_NAME} left running (KEEP_CONTAINER=1)"
  fi
  return $status
}
trap cleanup EXIT

# Runs psql inside the container and fails the whole script if it errors.
#
# Note: the output is filtered to hide the "does not exist, skipping" NOTICE
# lines that the idempotent schema emits, but the *exit status* is taken from
# psql itself, not from grep. Piping into `grep ... || true` would swallow
# failures and let a broken schema report success.
psql_step() {
  local label="$1"
  shift
  local output status

  set +e
  output="$(docker exec "$CONTAINER_NAME" psql -U "$PGUSER" -d "$PGDATABASE" \
    -v ON_ERROR_STOP=1 -f "$@" 2>&1)"
  status=$?
  set -e

  if [ $status -ne 0 ]; then
    echo "FAILED: ${label}" >&2
    echo "$output" >&2
    exit $status
  fi

  # Surface assertion results on success; suppress only the skip notices.
  local filtered
  filtered="$(printf '%s\n' "$output" | grep -vE "NOTICE:  (trigger|policy|table|index|view|function|schema|extension) .* does not exist, skipping" || true)"
  if [ -n "$filtered" ]; then
    printf '%s\n' "$filtered"
  fi
}

echo "==> Generating seed SQL from scripts/seed-data.mjs"
node "$ROOT/scripts/seed-sql.mjs" --out /tmp/seed-verify.sql

echo "==> Starting $IMAGE on port $PGPORT"
docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
if ! docker run -d --name "$CONTAINER_NAME" \
  -e POSTGRES_PASSWORD="$PGPASSWORD" \
  -e POSTGRES_DB="$PGDATABASE" \
  -p "$PGPORT:5432" \
  "$IMAGE" >/dev/null; then
  echo "error: could not start ${IMAGE} on port ${PGPORT}." >&2
  echo "       Another container may already be bound to that port; set PGPORT to something else." >&2
  exit 1
fi

echo "==> Waiting for Postgres"
ready=0
for _ in $(seq 1 60); do
  if docker exec "$CONTAINER_NAME" pg_isready -U "$PGUSER" >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 1
done
if [ "$ready" -ne 1 ]; then
  echo "error: Postgres did not become ready in time" >&2
  docker logs --tail 30 "$CONTAINER_NAME" >&2 || true
  exit 1
fi

for f in supabase/tests/local_fixture.sql supabase/schema.sql supabase/tests/verify.sql supabase/tests/embedding_semantics.sql; do
  docker cp "$ROOT/$f" "$CONTAINER_NAME:/tmp/$(basename "$f")" >/dev/null
done
docker cp /tmp/seed-verify.sql "$CONTAINER_NAME:/tmp/seed.sql" >/dev/null

# A migration you can only run against a pristine database is a migration that
# fails in production the first time it is re-applied, so apply it twice.
echo "==> Applying fixture + schema (pass 1)"
psql_step "local fixture + schema" /tmp/local_fixture.sql /tmp/schema.sql

echo "==> Re-applying schema (idempotency pass)"
psql_step "schema re-apply" /tmp/schema.sql

echo "==> Loading seed data"
psql_step "seed data" /tmp/seed.sql

echo "==> Running assertions"
psql_step "assertions" /tmp/verify.sql

# Runs last: it depends on the seed having written embeddings.
#
# The CI seed (`seed-sql.mjs`) uses the deterministic hash, not the real
# encoder, because it has no model download and no network. The assertions
# below only check that vectors are present, correctly shaped and queryable —
# never that they encode meaning, which a hash cannot. Quality of the
# embeddings themselves is verified against the live database, not here.
echo "==> Asserting the vector search tier is wired up"
psql_step "embedding semantics" /tmp/embedding_semantics.sql

echo "==> Database verification passed"
