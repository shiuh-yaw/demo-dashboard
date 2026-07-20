#!/usr/bin/env bash
# Migration replay + GTM-03.5A backfill fidelity check on a throwaway
# Postgres. Not wired into CI (CI has no Postgres); run locally for
# review evidence. Requires PostgreSQL 15+ client/server binaries on PATH
# or via PG_BIN.
#
#   packages/db/scripts/replay-check.sh
#
# Exits non-zero on: migration failure, non-empty `migrate diff`, a
# missing expected object, or a backfill fidelity mismatch.
set -euo pipefail

PG_BIN="${PG_BIN:-}"
if [ -z "$PG_BIN" ]; then
  for cand in /opt/homebrew/opt/postgresql@15/bin /usr/local/opt/postgresql@15/bin ""; do
    if [ -x "${cand}/initdb" ] || command -v initdb >/dev/null 2>&1; then
      PG_BIN="$cand"; break
    fi
  done
fi
INITDB="${PG_BIN:+$PG_BIN/}initdb"
PG_CTL="${PG_BIN:+$PG_BIN/}pg_ctl"
PSQL="${PG_BIN:+$PG_BIN/}psql"

HERE="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${PGPORT:-54329}"
PGDATA="$(mktemp -d)/pgdata"
export DATABASE_URL="postgresql://postgres@127.0.0.1:${PORT}/gtm_replay"
export DIRECT_URL="$DATABASE_URL"

"$INITDB" -D "$PGDATA" -U postgres --auth=trust >/dev/null 2>&1
"$PG_CTL" -D "$PGDATA" -o "-p $PORT -c listen_addresses=127.0.0.1 -c unix_socket_directories=/tmp" -w start >/dev/null 2>&1
cleanup() { "$PG_CTL" -D "$PGDATA" -w stop >/dev/null 2>&1 || true; rm -rf "$(dirname "$PGDATA")"; }
trap cleanup EXIT
"$PSQL" -h 127.0.0.1 -p "$PORT" -U postgres -c "CREATE DATABASE gtm_replay;" >/dev/null

cd "$HERE"
echo "=== migrate deploy ==="
npx prisma migrate deploy --schema=./prisma/schema.prisma

echo "=== migrate diff (must be empty) ==="
npx prisma migrate diff --from-url "$DATABASE_URL" \
  --to-schema-datamodel ./prisma/schema.prisma --exit-code
echo "diff clean"

q() { "$PSQL" "$DATABASE_URL" -tAc "$1"; }
fail() { echo "FAIL: $1" >&2; exit 1; }

echo "=== object assertions ==="
[ "$(q "SELECT COUNT(*) FROM pg_type WHERE typname='ProspectStatus' AND typtype='e'")" = "1" ] \
  || fail "ProspectStatus enum missing"
for t in Team TeamMembership ProspectTheme; do
  [ "$(q "SELECT COUNT(*) FROM pg_class WHERE relname='$t' AND relrowsecurity")" = "1" ] \
    || fail "RLS not enabled on $t"
done
[ "$(q "SELECT COUNT(*) FROM pg_indexes WHERE indexname='Prospect_teamId_domain_lower_key'")" = "1" ] \
  || fail "partial identity index missing"

echo "=== backfill fidelity on seeded fixtures ==="
q "INSERT INTO \"User\" (id,email,\"dynamicUserId\",role,\"createdAt\",\"updatedAt\")
   VALUES ('u1','a@x.com','sub-a','MEMBER',now(),now()),
          ('u2','b@x.com',NULL,'MEMBER',now(),now());" >/dev/null
q "INSERT INTO \"Prospect\" (id,\"ownerId\",\"teamId\",name,logo,\"primaryColor\",\"secondaryColor\",\"gradientTo\",domain,\"createdAt\",\"updatedAt\")
   VALUES ('p1','sub-a','team_gtm_default','Acme','custom','#FF0000','#00FF00','rgba(1,2,3,0.5)','acme.example',now(),now()),
          ('p2','sub-unknown','team_gtm_default','Beta','dynamic','#111111',NULL,NULL,NULL,now(),now());" >/dev/null
q "INSERT INTO \"DemoConfig\" (id,kind,\"ownerId\",\"prospectId\",config,\"createdAt\",\"updatedAt\")
   VALUES ('d1','wallet','sub-a','p1','{}',now(),now());" >/dev/null

# Re-run the migration's idempotent backfill statements against the seeded rows.
q "INSERT INTO \"ProspectTheme\" (id,\"prospectId\",\"borderRadius\",\"primaryColor\",\"primaryHoverColor\",\"secondaryColor\",\"accentColor\",\"pageBackground\",\"background\",\"foreground\",\"mutedTextColor\",\"borderColor\",\"rowBackground\",\"rowHoverBackground\",\"gradientFrom\",\"gradientTo\")
   SELECT 'ptheme_'||p.id,p.id,p.\"borderRadius\",p.\"primaryColor\",p.\"primaryHoverColor\",p.\"secondaryColor\",p.\"accentColor\",p.\"pageBackground\",p.background,p.foreground,p.\"mutedTextColor\",p.\"borderColor\",p.\"rowBackground\",p.\"rowHoverBackground\",p.\"gradientFrom\",p.\"gradientTo\"
   FROM \"Prospect\" p WHERE NOT EXISTS (SELECT 1 FROM \"ProspectTheme\" t WHERE t.\"prospectId\"=p.id);" >/dev/null
q "UPDATE \"Prospect\" p SET \"createdById\"=u.id FROM \"User\" u WHERE u.\"dynamicUserId\"=p.\"ownerId\" AND p.\"createdById\" IS NULL;" >/dev/null
q "UPDATE \"DemoConfig\" d SET \"createdById\"=u.id FROM \"User\" u WHERE u.\"dynamicUserId\"=d.\"ownerId\" AND d.\"createdById\" IS NULL;" >/dev/null
q "INSERT INTO \"TeamMembership\" (id,\"userId\",\"teamId\",\"createdAt\")
   SELECT 'tm_gtm_'||u.id,u.id,'team_gtm_default',now() FROM \"User\" u
   WHERE NOT EXISTS (SELECT 1 FROM \"TeamMembership\" m WHERE m.\"userId\"=u.id AND m.\"teamId\"='team_gtm_default');" >/dev/null

# Theme copy fidelity: palette columns match Prospect verbatim.
[ "$(q "SELECT \"primaryColor\"||'|'||COALESCE(\"secondaryColor\",'∅')||'|'||COALESCE(\"gradientTo\",'∅') FROM \"ProspectTheme\" WHERE \"prospectId\"='p1'")" = "#FF0000|#00FF00|rgba(1,2,3,0.5)" ] \
  || fail "theme copy fidelity (p1)"
[ "$(q "SELECT \"primaryColor\"||'|'||COALESCE(\"secondaryColor\",'∅') FROM \"ProspectTheme\" WHERE \"prospectId\"='p2'")" = "#111111|∅" ] \
  || fail "theme copy nullability (p2)"
# createdById resolution: matched by sub, null when unmatched.
[ "$(q "SELECT COALESCE(\"createdById\",'∅') FROM \"Prospect\" WHERE id='p1'")" = "u1" ] || fail "prospect createdById resolution"
[ "$(q "SELECT COALESCE(\"createdById\",'∅') FROM \"Prospect\" WHERE id='p2'")" = "∅" ] || fail "prospect createdById unmatched-must-be-null"
[ "$(q "SELECT COALESCE(\"createdById\",'∅') FROM \"DemoConfig\" WHERE id='d1'")" = "u1" ] || fail "democonfig createdById resolution"
# Membership seeding: one per user (u1 and u2 both joined).
[ "$(q "SELECT COUNT(*) FROM \"TeamMembership\" WHERE \"teamId\"='team_gtm_default'")" = "2" ] || fail "membership seeding count"
# Idempotency: re-running seeds nothing new.
q "INSERT INTO \"TeamMembership\" (id,\"userId\",\"teamId\",\"createdAt\")
   SELECT 'tm_gtm_'||u.id,u.id,'team_gtm_default',now() FROM \"User\" u
   WHERE NOT EXISTS (SELECT 1 FROM \"TeamMembership\" m WHERE m.\"userId\"=u.id AND m.\"teamId\"='team_gtm_default');" >/dev/null
[ "$(q "SELECT COUNT(*) FROM \"TeamMembership\"")" = "2" ] || fail "membership backfill not idempotent"

echo "ALL CHECKS PASSED"
