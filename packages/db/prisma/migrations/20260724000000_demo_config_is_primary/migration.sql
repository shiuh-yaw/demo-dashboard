-- Additive: new column defaults false; backfill below is idempotent (keyed by id).
ALTER TABLE "DemoConfig" ADD COLUMN "isPrimary" BOOLEAN NOT NULL DEFAULT false;

-- Pin each config a legacy reverse-FK column referenced; those columns still
-- exist physically until the later contract migration drops them.
UPDATE "DemoConfig" SET "isPrimary" = true
WHERE id IN (SELECT "demoEarnId" FROM "Prospect" WHERE "demoEarnId" IS NOT NULL);

UPDATE "DemoConfig" SET "isPrimary" = true
WHERE id IN (SELECT "demoCheckoutsId" FROM "Prospect" WHERE "demoCheckoutsId" IS NOT NULL);

UPDATE "DemoConfig" SET "isPrimary" = true
WHERE id IN (SELECT "demoWalletId" FROM "Prospect" WHERE "demoWalletId" IS NOT NULL);

UPDATE "DemoConfig" SET "isPrimary" = true
WHERE id IN (SELECT "demoRemittanceId" FROM "Prospect" WHERE "demoRemittanceId" IS NOT NULL);
