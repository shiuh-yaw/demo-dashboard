-- Prospect.teamId becomes optional: a prospect belongs to no team until
-- explicitly assigned. Metadata-only (drops NOT NULL + DEFAULT); no data
-- rewrite. Existing rows keep their current teamId; the controller nulls
-- them post-deploy so the currently-deployed Prisma client (teamId non-null)
-- never reads a NULL during the deploy window.
ALTER TABLE "Prospect" ALTER COLUMN "teamId" DROP NOT NULL;
ALTER TABLE "Prospect" ALTER COLUMN "teamId" DROP DEFAULT;
