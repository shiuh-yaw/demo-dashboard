-- Fold the legacy `RemittanceConfig` table into the unified `DemoConfig`
-- carrier introduced by PR #81 (migration `20260512000000_init_demo_config`).
-- Per D-029, every demo type lives in a single `DemoConfig` table
-- discriminated by `kind`; remittance is the last per-type table to migrate.
--
-- Steps:
--   1. Copy every existing `RemittanceConfig` row into `DemoConfig` with
--      `kind = 'remittance'`. `themeOverrides` is NULL — `RemittanceConfig`
--      never had an embedded theme column (D-028, PR #59), so there are no
--      deltas to capture. `ON CONFLICT (id) DO NOTHING` keeps the migration
--      safe if a prior `backfill:demo-configs` run ever landed the same id.
--   2. Drop the FK constraint then the legacy table.
--
-- Q-014: legacy ids are preserved verbatim so existing demo URLs keep
-- resolving unchanged.

INSERT INTO "DemoConfig" (id, kind, "ownerId", name, description, "brandId", "themeOverrides", config, "createdAt", "updatedAt")
SELECT id, 'remittance', "ownerId", name, description, "brandId", NULL, config, "createdAt", "updatedAt"
FROM "RemittanceConfig"
ON CONFLICT (id) DO NOTHING;

ALTER TABLE "RemittanceConfig" DROP CONSTRAINT IF EXISTS "RemittanceConfig_brandId_fkey";
DROP TABLE IF EXISTS "RemittanceConfig";
