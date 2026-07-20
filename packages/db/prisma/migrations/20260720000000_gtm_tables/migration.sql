-- GTM platform tables -- User, ShareLink, VisitorSession, TrackEvent.
-- Purely additive (CREATE TABLE only) -- production applies this via
-- `prisma migrate deploy` mid-build against a LIVE Supabase database, so
-- no existing table/column is touched.
--
-- `ShareLink.prospectId` intentionally has no FK constraint here (mirrors
-- the existing `Transaction.prospectId` / `WebhookEvent.prospectId`
-- pattern): decoupled lifetimes, no migration-order dependency on the
-- Prospect table shape. `demoConfigId` is likewise unconstrained; both are
-- validated at the service layer (`services.shareLinks.mint` verifies the
-- demoConfig and prospect exist before minting).

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "dynamicUserId" TEXT,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "schedulingUrl" TEXT,
    "role" "Role" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShareLink" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "demoConfigId" TEXT NOT NULL,
    "prospectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShareLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisitorSession" (
    "id" TEXT NOT NULL,
    "shareLinkId" TEXT,
    "demoSlug" TEXT NOT NULL,
    "anonId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "device" TEXT,
    "os" TEXT,
    "browser" TEXT,
    "country" TEXT,
    "region" TEXT,
    "city" TEXT,
    "ipHash" TEXT,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "enrichment" JSONB,

    CONSTRAINT "VisitorSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackEvent" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "path" TEXT,
    "props" JSONB,

    CONSTRAINT "TrackEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_dynamicUserId_key" ON "User"("dynamicUserId");

-- CreateIndex
CREATE UNIQUE INDEX "ShareLink_token_key" ON "ShareLink"("token");

-- CreateIndex
CREATE INDEX "VisitorSession_shareLinkId_idx" ON "VisitorSession"("shareLinkId");

-- CreateIndex
CREATE INDEX "VisitorSession_demoSlug_startedAt_idx" ON "VisitorSession"("demoSlug", "startedAt");

-- CreateIndex
CREATE INDEX "TrackEvent_sessionId_ts_idx" ON "TrackEvent"("sessionId", "ts");

-- AddForeignKey
ALTER TABLE "ShareLink" ADD CONSTRAINT "ShareLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitorSession" ADD CONSTRAINT "VisitorSession_shareLinkId_fkey" FOREIGN KEY ("shareLinkId") REFERENCES "ShareLink"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackEvent" ADD CONSTRAINT "TrackEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "VisitorSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Enable Row Level Security on all four new tables (belt-and-suspenders
-- posture, per D-013): no policies are added, so RLS rejects all direct
-- queries from non-privileged roles; the dashboard's Prisma singleton
-- connects with the privileged role and is unaffected.
ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ShareLink" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."VisitorSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."TrackEvent" ENABLE ROW LEVEL SECURITY;

-- Additive only. Backfills run in-line so `Prospect.teamId` reaches NOT
-- NULL and every Prospect owns a ProspectTheme before the row is served.
-- Prospect's flat palette columns are copied, not dropped - they stay
-- canonical until the cutover and are removed only at the contract migration.

-- CreateEnum
CREATE TYPE "ProspectStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMembership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProspectTheme" (
    "id" TEXT NOT NULL,
    "prospectId" TEXT NOT NULL,
    "borderRadius" TEXT,
    "primaryColor" TEXT NOT NULL,
    "primaryHoverColor" TEXT,
    "secondaryColor" TEXT,
    "accentColor" TEXT,
    "pageBackground" TEXT,
    "background" TEXT,
    "foreground" TEXT,
    "mutedTextColor" TEXT,
    "borderColor" TEXT,
    "rowBackground" TEXT,
    "rowHoverBackground" TEXT,
    "gradientFrom" TEXT,
    "gradientTo" TEXT,

    CONSTRAINT "ProspectTheme_pkey" PRIMARY KEY ("id")
);

-- AlterTable
-- DEFAULT keeps pre-promotion clients (which omit teamId) inserting safely
-- during the deploy window; dropped at contract.
ALTER TABLE "Prospect" ADD COLUMN "teamId" TEXT DEFAULT 'team_gtm_default',
                       ADD COLUMN "createdById" TEXT,
                       ADD COLUMN "status" "ProspectStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "DemoConfig" ADD COLUMN "createdById" TEXT;
ALTER TABLE "DemoConfig" ALTER COLUMN "prospectId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "deactivatedAt" TIMESTAMP(3);

-- Backfill: seed the default team (slug 'gtm').
INSERT INTO "Team" ("id", "name", "slug", "createdAt")
VALUES ('team_gtm_default', 'GTM', 'gtm', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

-- Backfill: every existing Prospect joins the default team.
UPDATE "Prospect" SET "teamId" = 'team_gtm_default' WHERE "teamId" IS NULL;

-- Backfill: one ProspectTheme per Prospect, copying the palette verbatim.
INSERT INTO "ProspectTheme" (
    "id", "prospectId", "borderRadius", "primaryColor", "primaryHoverColor",
    "secondaryColor", "accentColor", "pageBackground", "background",
    "foreground", "mutedTextColor", "borderColor", "rowBackground",
    "rowHoverBackground", "gradientFrom", "gradientTo"
)
SELECT
    'ptheme_' || p."id", p."id", p."borderRadius", p."primaryColor",
    p."primaryHoverColor", p."secondaryColor", p."accentColor",
    p."pageBackground", p."background", p."foreground", p."mutedTextColor",
    p."borderColor", p."rowBackground", p."rowHoverBackground",
    p."gradientFrom", p."gradientTo"
FROM "Prospect" p
WHERE NOT EXISTS (
    SELECT 1 FROM "ProspectTheme" t WHERE t."prospectId" = p."id"
);

-- Backfill: resolve createdById from legacy ownerId (JWT sub) via User.dynamicUserId.
UPDATE "Prospect" p SET "createdById" = u."id"
FROM "User" u
WHERE u."dynamicUserId" = p."ownerId" AND p."createdById" IS NULL;

UPDATE "DemoConfig" d SET "createdById" = u."id"
FROM "User" u
WHERE u."dynamicUserId" = d."ownerId" AND d."createdById" IS NULL;

-- Backfill: every existing User joins the default team.
INSERT INTO "TeamMembership" ("id", "userId", "teamId", "createdAt")
SELECT 'tm_gtm_' || u."id", u."id", 'team_gtm_default', CURRENT_TIMESTAMP
FROM "User" u
WHERE NOT EXISTS (
    SELECT 1 FROM "TeamMembership" m
    WHERE m."userId" = u."id" AND m."teamId" = 'team_gtm_default'
);

-- teamId is mandatory now that every row is backfilled.
ALTER TABLE "Prospect" ALTER COLUMN "teamId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Team_slug_key" ON "Team"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMembership_userId_teamId_key" ON "TeamMembership"("userId", "teamId");

-- CreateIndex
CREATE INDEX "TeamMembership_teamId_idx" ON "TeamMembership"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "ProspectTheme_prospectId_key" ON "ProspectTheme"("prospectId");

-- CreateIndex
CREATE INDEX "Prospect_teamId_idx" ON "Prospect"("teamId");

-- CreateIndex
CREATE INDEX "Prospect_createdById_idx" ON "Prospect"("createdById");

-- CreateIndex
CREATE INDEX "DemoConfig_createdById_idx" ON "DemoConfig"("createdById");

-- Partial unique identity guard on (teamId, lower(domain)). Skipped (not
-- failed) when legacy data already collides; merge is Phase 07's affordance.
DO $$
DECLARE
    collisions integer;
BEGIN
    SELECT COUNT(*) INTO collisions FROM (
        SELECT "teamId", lower("domain")
        FROM "Prospect"
        WHERE "domain" IS NOT NULL
        GROUP BY "teamId", lower("domain")
        HAVING COUNT(*) > 1
    ) dups;
    IF collisions = 0 THEN
        CREATE UNIQUE INDEX "Prospect_teamId_domain_lower_key"
            ON "Prospect" ("teamId", lower("domain"))
            WHERE "domain" IS NOT NULL;
    ELSE
        RAISE NOTICE 'NOTE: skipped Prospect_teamId_domain_lower_key: % colliding (teamId, lower(domain)) group(s); resolve via Phase 07 merge then create the index manually.', collisions;
    END IF;
END $$;

-- AddForeignKey
ALTER TABLE "TeamMembership" ADD CONSTRAINT "TeamMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMembership" ADD CONSTRAINT "TeamMembership_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProspectTheme" ADD CONSTRAINT "ProspectTheme_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prospect" ADD CONSTRAINT "Prospect_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prospect" ADD CONSTRAINT "Prospect_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemoConfig" ADD CONSTRAINT "DemoConfig_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Enable Row Level Security on the three new tables (D-013 posture).
ALTER TABLE public."Team" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."TeamMembership" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ProspectTheme" ENABLE ROW LEVEL SECURITY;
