-- Phase GTM-01: rename Brand to Prospect -- EXPAND step (expand-contract).
--
-- A prospect is a company we sell to; the visual theme columns already on
-- the legacy "Brand" table are one facet of that identity, not the whole
-- record (see docs/projects/gtm-platform/DECISIONS.md). The end state adds
-- nullable identity columns (domain, notes) -- no data loss.
--
-- WHY EXPAND-CONTRACT (not an in-place ALTER TABLE ... RENAME):
-- Production serves these tables live (Supabase, USE_POSTGRES_* flags on).
-- `prisma migrate deploy` runs mid-build on Vercel, BEFORE the new
-- deployment is promoted. During that window the OLD deployment is still
-- serving traffic and still reads/writes "Brand", "DemoConfig"."brandId",
-- etc. An in-place rename would make every old-deployment query error for
-- the minutes until promotion. So this migration only ADDS: a new
-- "Prospect" table (populated from "Brand") and new "prospectId" columns
-- alongside the retained legacy "brandId" columns. The legacy "Brand"
-- table, "brandId" columns, FK, and indexes all stay in place so the old
-- deployment keeps working untouched.
--
-- Forward-sync triggers (prefixed gtm01_sync_) mirror writes the OLD
-- deployment makes during the window (into "Brand" / "brandId") forward
-- into "Prospect" / "prospectId", so the new deployment sees them after
-- promotion. They are FORWARD-ONLY: the new code writes "Prospect" /
-- "prospectId" directly, and nothing syncs those back to the legacy
-- columns. The legacy "Brand" table and "brandId" columns are dropped in
-- the follow-up CONTRACT migration (Phase GTM-01b), which also drops these
-- triggers -- see that migration. Do not keep the triggers past the rename
-- deploy.
--
-- The deterministic backfill id hash (ownerId, primaryColor, logoUrl) in
-- apps/dashboard/scripts/backfill-prospects/hash.ts is unaffected -- the
-- hash inputs are unchanged, only the table/column names move.

-- ---------------------------------------------------------------------------
-- 1. New "Prospect" table: exactly the columns of "Brand" plus domain/notes.
-- ---------------------------------------------------------------------------
CREATE TABLE "Prospect" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "primaryColor" TEXT NOT NULL,
    "secondaryColor" TEXT,
    "accentColor" TEXT,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyUrl" TEXT,
    "logo" TEXT NOT NULL DEFAULT 'dynamic',
    "borderRadius" TEXT,
    "primaryHoverColor" TEXT,
    "pageBackground" TEXT,
    "background" TEXT,
    "foreground" TEXT,
    "mutedTextColor" TEXT,
    "borderColor" TEXT,
    "rowBackground" TEXT,
    "rowHoverBackground" TEXT,
    "gradientFrom" TEXT,
    "gradientTo" TEXT,
    "demoEarnId" TEXT,
    "demoCheckoutsId" TEXT,
    "demoWalletId" TEXT,
    "demoRemittanceId" TEXT,
    "domain" TEXT,
    "notes" TEXT,

    CONSTRAINT "Prospect_pkey" PRIMARY KEY ("id")
);

-- Match the RLS posture of "Brand" (enabled belt-and-suspenders with no
-- policies, per D-013). Prisma connects with the privileged role and
-- bypasses RLS; a future non-privileged caller is blocked by default.
ALTER TABLE "Prospect" ENABLE ROW LEVEL SECURITY;

-- Mirror "Brand_ownerId_idx".
CREATE INDEX "Prospect_ownerId_idx" ON "Prospect"("ownerId");

-- Copy every existing "Brand" row, ids preserved byte-for-byte. domain and
-- notes are NULL for pre-existing rows (they had no such values).
INSERT INTO "Prospect" (
    "id", "ownerId", "name", "description", "primaryColor", "secondaryColor",
    "accentColor", "logoUrl", "createdAt", "updatedAt", "companyUrl", "logo",
    "borderRadius", "primaryHoverColor", "pageBackground", "background",
    "foreground", "mutedTextColor", "borderColor", "rowBackground",
    "rowHoverBackground", "gradientFrom", "gradientTo", "demoEarnId",
    "demoCheckoutsId", "demoWalletId", "demoRemittanceId", "domain", "notes"
)
SELECT
    "id", "ownerId", "name", "description", "primaryColor", "secondaryColor",
    "accentColor", "logoUrl", "createdAt", "updatedAt", "companyUrl", "logo",
    "borderRadius", "primaryHoverColor", "pageBackground", "background",
    "foreground", "mutedTextColor", "borderColor", "rowBackground",
    "rowHoverBackground", "gradientFrom", "gradientTo", "demoEarnId",
    "demoCheckoutsId", "demoWalletId", "demoRemittanceId", NULL, NULL
FROM "Brand";

-- ---------------------------------------------------------------------------
-- 2. New "prospectId" columns alongside the retained legacy "brandId".
-- ---------------------------------------------------------------------------

-- DemoConfig: legacy "brandId" was NOT NULL. Relax it to nullable so the
-- new deployment (which writes only "prospectId") can insert without it.
-- Old-deployment inserts still always supply "brandId", so this is safe.
ALTER TABLE "DemoConfig" ADD COLUMN "prospectId" TEXT;
UPDATE "DemoConfig" SET "prospectId" = "brandId";
ALTER TABLE "DemoConfig" ALTER COLUMN "prospectId" SET NOT NULL;
ALTER TABLE "DemoConfig" ALTER COLUMN "brandId" DROP NOT NULL;
CREATE INDEX "DemoConfig_prospectId_idx" ON "DemoConfig"("prospectId");
-- Mirror the semantics of the existing "DemoConfig_brandId_fkey"
-- (ON DELETE RESTRICT ON UPDATE NO ACTION), now referencing "Prospect".
ALTER TABLE "DemoConfig" ADD CONSTRAINT "DemoConfig_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- Transaction: legacy "brandId" is nullable, no FK. Mirror only the index.
ALTER TABLE "Transaction" ADD COLUMN "prospectId" TEXT;
UPDATE "Transaction" SET "prospectId" = "brandId";
CREATE INDEX "Transaction_prospectId_idx" ON "Transaction"("prospectId");

-- WebhookEvent: legacy "brandId" is nullable, no index, no FK.
ALTER TABLE "WebhookEvent" ADD COLUMN "prospectId" TEXT;
UPDATE "WebhookEvent" SET "prospectId" = "brandId";

-- ---------------------------------------------------------------------------
-- 3. Forward-sync triggers (deploy-window only).
--
-- DROPPED IN THE CONTRACT MIGRATION (Phase GTM-01b) -- do not keep past the
-- rename deploy. Forward-only: they never write the legacy columns, and no
-- triggers exist on "Prospect", so new-code writes to "Prospect" /
-- "prospectId" never sync backwards and cannot recurse.
-- ---------------------------------------------------------------------------

-- (a) Mirror every "Brand" write forward into "Prospect". Upsert on INSERT/
--     UPDATE (leaving domain/notes untouched so new-code values survive),
--     delete on DELETE.
--     DROPPED IN THE CONTRACT MIGRATION (Phase GTM-01b) -- do not keep past
--     the rename deploy.
CREATE OR REPLACE FUNCTION "gtm01_sync_brand_to_prospect"() RETURNS trigger AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    DELETE FROM "Prospect" WHERE "id" = OLD."id";
    RETURN OLD;
  END IF;

  INSERT INTO "Prospect" (
    "id", "ownerId", "name", "description", "primaryColor", "secondaryColor",
    "accentColor", "logoUrl", "createdAt", "updatedAt", "companyUrl", "logo",
    "borderRadius", "primaryHoverColor", "pageBackground", "background",
    "foreground", "mutedTextColor", "borderColor", "rowBackground",
    "rowHoverBackground", "gradientFrom", "gradientTo", "demoEarnId",
    "demoCheckoutsId", "demoWalletId", "demoRemittanceId"
  ) VALUES (
    NEW."id", NEW."ownerId", NEW."name", NEW."description", NEW."primaryColor",
    NEW."secondaryColor", NEW."accentColor", NEW."logoUrl", NEW."createdAt",
    NEW."updatedAt", NEW."companyUrl", NEW."logo", NEW."borderRadius",
    NEW."primaryHoverColor", NEW."pageBackground", NEW."background",
    NEW."foreground", NEW."mutedTextColor", NEW."borderColor",
    NEW."rowBackground", NEW."rowHoverBackground", NEW."gradientFrom",
    NEW."gradientTo", NEW."demoEarnId", NEW."demoCheckoutsId",
    NEW."demoWalletId", NEW."demoRemittanceId"
  )
  ON CONFLICT ("id") DO UPDATE SET
    "ownerId" = EXCLUDED."ownerId",
    "name" = EXCLUDED."name",
    "description" = EXCLUDED."description",
    "primaryColor" = EXCLUDED."primaryColor",
    "secondaryColor" = EXCLUDED."secondaryColor",
    "accentColor" = EXCLUDED."accentColor",
    "logoUrl" = EXCLUDED."logoUrl",
    "createdAt" = EXCLUDED."createdAt",
    "updatedAt" = EXCLUDED."updatedAt",
    "companyUrl" = EXCLUDED."companyUrl",
    "logo" = EXCLUDED."logo",
    "borderRadius" = EXCLUDED."borderRadius",
    "primaryHoverColor" = EXCLUDED."primaryHoverColor",
    "pageBackground" = EXCLUDED."pageBackground",
    "background" = EXCLUDED."background",
    "foreground" = EXCLUDED."foreground",
    "mutedTextColor" = EXCLUDED."mutedTextColor",
    "borderColor" = EXCLUDED."borderColor",
    "rowBackground" = EXCLUDED."rowBackground",
    "rowHoverBackground" = EXCLUDED."rowHoverBackground",
    "gradientFrom" = EXCLUDED."gradientFrom",
    "gradientTo" = EXCLUDED."gradientTo",
    "demoEarnId" = EXCLUDED."demoEarnId",
    "demoCheckoutsId" = EXCLUDED."demoCheckoutsId",
    "demoWalletId" = EXCLUDED."demoWalletId",
    "demoRemittanceId" = EXCLUDED."demoRemittanceId";
    -- "domain"/"notes" deliberately NOT synced: they exist only on
    -- "Prospect", and new-code values must survive an old-code "Brand" write.

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- DROPPED IN THE CONTRACT MIGRATION (Phase GTM-01b) -- do not keep past the
-- rename deploy.
CREATE TRIGGER "gtm01_sync_brand_to_prospect"
  AFTER INSERT OR UPDATE OR DELETE ON "Brand"
  FOR EACH ROW EXECUTE FUNCTION "gtm01_sync_brand_to_prospect"();

-- (b) Copy legacy "brandId" forward to "prospectId" on old-deployment
--     writes. On INSERT: if "prospectId" was not supplied (old code) but
--     "brandId" was, mirror it -- this also satisfies DemoConfig's NOT NULL
--     "prospectId" because BEFORE ROW triggers run before constraint checks.
--     On UPDATE: mirror only when "brandId" actually changed. New-code
--     writes set "prospectId" directly and leave "brandId" NULL, so this
--     never overwrites them.
--     DROPPED IN THE CONTRACT MIGRATION (Phase GTM-01b) -- do not keep past
--     the rename deploy.
CREATE OR REPLACE FUNCTION "gtm01_sync_brandid_to_prospectid"() RETURNS trigger AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    IF NEW."prospectId" IS NULL AND NEW."brandId" IS NOT NULL THEN
      NEW."prospectId" := NEW."brandId";
    END IF;
  ELSIF (TG_OP = 'UPDATE') THEN
    IF NEW."brandId" IS DISTINCT FROM OLD."brandId" THEN
      NEW."prospectId" := NEW."brandId";
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- DROPPED IN THE CONTRACT MIGRATION (Phase GTM-01b) -- do not keep past the
-- rename deploy.
CREATE TRIGGER "gtm01_sync_democonfig_brandid"
  BEFORE INSERT OR UPDATE ON "DemoConfig"
  FOR EACH ROW EXECUTE FUNCTION "gtm01_sync_brandid_to_prospectid"();

-- DROPPED IN THE CONTRACT MIGRATION (Phase GTM-01b) -- do not keep past the
-- rename deploy.
CREATE TRIGGER "gtm01_sync_transaction_brandid"
  BEFORE INSERT OR UPDATE ON "Transaction"
  FOR EACH ROW EXECUTE FUNCTION "gtm01_sync_brandid_to_prospectid"();

-- DROPPED IN THE CONTRACT MIGRATION (Phase GTM-01b) -- do not keep past the
-- rename deploy.
CREATE TRIGGER "gtm01_sync_webhookevent_brandid"
  BEFORE INSERT OR UPDATE ON "WebhookEvent"
  FOR EACH ROW EXECUTE FUNCTION "gtm01_sync_brandid_to_prospectid"();
