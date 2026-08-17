-- Relaxing only: an AUTO prospect created from an inbound lead has no owner
-- until someone claims it. Existing rows keep their ownerId, and dropping NOT
-- NULL never rejects data that was valid before, so this is safe to apply
-- ahead of the code that writes unowned rows.
ALTER TABLE "Prospect" ALTER COLUMN "ownerId" DROP NOT NULL;
