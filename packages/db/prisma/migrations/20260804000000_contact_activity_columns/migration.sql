-- AlterTable
ALTER TABLE "Contact" ADD COLUMN     "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "sightingCount" INTEGER NOT NULL DEFAULT 0;

-- One-time backfill: derive lastSeenAt/sightingCount for existing contacts
-- from the same source the add_contact_tables backfill used (non-internal
-- authenticated events with a valid email).
UPDATE "Contact" c
SET "lastSeenAt" = sub.last_ts,
    "sightingCount" = sub.cnt
FROM (
  SELECT lower(te."props"->>'email') AS email,
         max(te."ts") AS last_ts,
         count(*)::int AS cnt
  FROM "TrackEvent" te
  JOIN "VisitorSession" vs ON vs."id" = te."sessionId"
  WHERE te."name" = 'authenticated'
    AND te."type" = 'milestone'
    AND vs."isInternal" = false
    AND te."props"->>'email' IS NOT NULL
    AND te."props"->>'email' <> ''
    AND position('@' in te."props"->>'email') > 0
  GROUP BY lower(te."props"->>'email')
) sub
WHERE c."email" = sub.email;
