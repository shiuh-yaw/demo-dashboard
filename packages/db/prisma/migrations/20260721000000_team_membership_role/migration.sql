-- Per-team role on TeamMembership. Additive: NOT NULL with a DEFAULT so the
-- live table (production applies this via `prisma migrate deploy` mid-build)
-- backfills every existing row to MEMBER without a table rewrite. The "Role"
-- enum already exists (created in 20260720000000_gtm_tables).
ALTER TABLE "TeamMembership" ADD COLUMN "role" "Role" NOT NULL DEFAULT 'MEMBER';
