-- Phase 2-brand-cutover: expand the Brand row with the full visual theme
-- the legacy `BrandProfile` aggregate (Redis-only) carried, plus the
-- demo-config id mirror columns. Strictly additive — no drops, no renames.
-- Every new column is nullable except `logo`, which has a default so
-- existing rows backfill safely.
ALTER TABLE public."Brand" ADD COLUMN "companyUrl" TEXT;
ALTER TABLE public."Brand" ADD COLUMN "logo" TEXT NOT NULL DEFAULT 'dynamic';
ALTER TABLE public."Brand" ADD COLUMN "borderRadius" TEXT;
ALTER TABLE public."Brand" ADD COLUMN "primaryHoverColor" TEXT;
ALTER TABLE public."Brand" ADD COLUMN "pageBackground" TEXT;
ALTER TABLE public."Brand" ADD COLUMN "background" TEXT;
ALTER TABLE public."Brand" ADD COLUMN "foreground" TEXT;
ALTER TABLE public."Brand" ADD COLUMN "mutedTextColor" TEXT;
ALTER TABLE public."Brand" ADD COLUMN "borderColor" TEXT;
ALTER TABLE public."Brand" ADD COLUMN "rowBackground" TEXT;
ALTER TABLE public."Brand" ADD COLUMN "rowHoverBackground" TEXT;
ALTER TABLE public."Brand" ADD COLUMN "gradientFrom" TEXT;
ALTER TABLE public."Brand" ADD COLUMN "gradientTo" TEXT;
ALTER TABLE public."Brand" ADD COLUMN "demoEarnId" TEXT;
ALTER TABLE public."Brand" ADD COLUMN "demoCheckoutsId" TEXT;
ALTER TABLE public."Brand" ADD COLUMN "demoWalletId" TEXT;
ALTER TABLE public."Brand" ADD COLUMN "demoRemittanceId" TEXT;
