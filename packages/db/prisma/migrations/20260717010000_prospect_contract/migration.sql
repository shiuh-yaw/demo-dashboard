-- Phase GTM-01b: drop the legacy Brand table -- CONTRACT step (expand-contract).
--
-- The GTM-01 EXPAND migration (20260717000000_prospect_rename) added the
-- "Prospect" table and "prospectId" columns while retaining the legacy
-- "Brand" table, "brandId" columns, their FK/indexes, and forward-sync
-- triggers so the pre-promotion deployment kept working during the deploy
-- window.
--
-- MERGE ONLY after the GTM-01 production deploy has promoted and been
-- verified healthy. Once the new deployment is the only one serving
-- traffic, nothing reads or writes the legacy columns and the forward-sync
-- triggers are dead weight. This migration removes all of it. It is
-- destructive (drops columns + a table) but only of data already mirrored
-- into "Prospect" / "prospectId" during EXPAND.

-- 1. Drop the forward-sync triggers first (they reference the legacy
--    columns/table). Triggers on "Brand" would vanish with the table, but
--    drop them explicitly for clarity and to avoid depending on cascade.
DROP TRIGGER IF EXISTS "gtm01_sync_webhookevent_brandid" ON "WebhookEvent";
DROP TRIGGER IF EXISTS "gtm01_sync_transaction_brandid" ON "Transaction";
DROP TRIGGER IF EXISTS "gtm01_sync_democonfig_brandid" ON "DemoConfig";
DROP TRIGGER IF EXISTS "gtm01_sync_brand_to_prospect" ON "Brand";
DROP FUNCTION IF EXISTS "gtm01_sync_brandid_to_prospectid"();
DROP FUNCTION IF EXISTS "gtm01_sync_brand_to_prospect"();

-- 2. Drop the legacy FK constraint before its table.
ALTER TABLE "DemoConfig" DROP CONSTRAINT IF EXISTS "DemoConfig_brandId_fkey";

-- 3. Drop the legacy indexes.
DROP INDEX IF EXISTS "DemoConfig_brandId_idx";
DROP INDEX IF EXISTS "Transaction_brandId_idx";

-- 4. Drop the legacy mirror columns.
ALTER TABLE "DemoConfig" DROP COLUMN "brandId";
ALTER TABLE "Transaction" DROP COLUMN "brandId";
ALTER TABLE "WebhookEvent" DROP COLUMN "brandId";

-- 5. Drop the legacy table. Its rows already live in "Prospect".
DROP TABLE "Brand";
