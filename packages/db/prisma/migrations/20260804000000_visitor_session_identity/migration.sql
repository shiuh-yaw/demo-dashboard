-- Additive: session-level identity captured via identify() (packages/analytics). Nullable, no backfill.
ALTER TABLE "VisitorSession" ADD COLUMN     "identifiedEmail" TEXT,
ADD COLUMN     "identifiedUserId" TEXT,
ADD COLUMN     "identityTraits" JSONB;
