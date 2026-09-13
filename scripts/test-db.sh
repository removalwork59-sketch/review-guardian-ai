#!/usr/bin/env bash
# Database test pipeline for the Removal Work schema, on a throwaway local Postgres.
#
#   PSQL=/path/to/psql PGPORT=54329 LEGACY_MIGRATIONS=/path/to/orbitrep/supabase/migrations scripts/test-db.sh
#
# 1. Fresh database: Supabase shims + schema migration in a single transaction.
# 2. Production-like database: shims + legacy OrbitRep migrations + legacy seed data, then the
#    schema migration twice (idempotency), the rollback, a re-apply, and the RLS/state-machine suite.
# Never point this at a real Supabase project.
set -euo pipefail

PSQL=${PSQL:-psql}
PGHOST=${PGHOST:-127.0.0.1}
PGPORT=${PGPORT:-5432}
PGUSER=${PGUSER:-postgres}
ROOT=$(cd "$(dirname "$0")/.." && pwd)
MIGRATION="$ROOT/supabase/migrations/20260913200000_removal_work_schema.sql"
ROLLBACK="$ROOT/supabase/rollback/20260913200000_removal_work_schema.down.sql"
SHIMS="$ROOT/supabase/tests/00_supabase_shims.sql"
SUITE="$ROOT/supabase/tests/10_rls_and_state_machines.sql"

p() { "$PSQL" -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -v ON_ERROR_STOP=1 -q "$@"; }
fresh_db() { p -c "DROP DATABASE IF EXISTS $1" -c "CREATE DATABASE $1" >/dev/null; p -d "$1" -f "$SHIMS" >/dev/null 2>&1; }

echo "== fresh database, single transaction =="
fresh_db rw_test_fresh
p -d rw_test_fresh -1 -f "$MIGRATION" >/dev/null 2>&1
echo "ok"

echo "== production-like database =="
fresh_db rw_test_legacy
if [ -n "${LEGACY_MIGRATIONS:-}" ]; then
  for f in "$LEGACY_MIGRATIONS"/*.sql; do p -d rw_test_legacy -f "$f" >/dev/null 2>&1; done
  p -d rw_test_legacy >/dev/null <<'SQL'
INSERT INTO public.businesses (id, owner_id, name)
VALUES ('00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-000000000001', 'Legacy Client');
INSERT INTO public.business_members (business_id, user_id, role)
VALUES ('00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-000000000002', 'analyst');
SQL
else
  echo "LEGACY_MIGRATIONS not set: seeding the legacy workspace tables minimally"
  p -d rw_test_legacy >/dev/null <<'SQL'
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'analyst');
CREATE TABLE public.businesses (id uuid PRIMARY KEY, owner_id uuid NOT NULL, name text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.business_members (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL REFERENCES public.businesses(id), user_id uuid NOT NULL, role public.app_role NOT NULL DEFAULT 'analyst', UNIQUE (business_id, user_id));
INSERT INTO public.businesses (id, owner_id, name) VALUES ('00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-000000000001', 'Legacy Client');
INSERT INTO public.business_members (business_id, user_id, role) VALUES ('00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-000000000002', 'analyst');
SQL
fi

p -d rw_test_legacy -1 -f "$MIGRATION" >/dev/null 2>&1 && echo "apply: ok"
p -d rw_test_legacy -1 -f "$MIGRATION" >/dev/null 2>&1 && echo "re-apply (idempotent): ok"
p -d rw_test_legacy -1 -f "$ROLLBACK" >/dev/null 2>&1 && echo "rollback: ok"
p -d rw_test_legacy -1 -f "$MIGRATION" >/dev/null 2>&1 && echo "apply after rollback: ok"
p -d rw_test_legacy -c "INSERT INTO public.user_roles (user_id, role) VALUES ('00000000-0000-0000-0000-000000000003', 'superadmin')" >/dev/null

echo "== RLS and state-machine suite =="
"$PSQL" -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d rw_test_legacy -f "$SUITE" 2>&1 | grep -E "PASS:|FAIL|ERROR|ALL DATABASE TESTS PASSED" | sed -E 's/^.*NOTICE: +//'
