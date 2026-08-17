-- Additive: AUTO marks a prospect created from an inbound lead's email domain
-- rather than curated by an operator. No backfill - existing rows stay ACTIVE.
-- Safe in a transaction: this only ADDs the value. Postgres forbids USING a new
-- enum value in the transaction that added it, so nothing may write status
-- 'AUTO' until this migration has committed.
ALTER TYPE "ProspectStatus" ADD VALUE 'AUTO';
