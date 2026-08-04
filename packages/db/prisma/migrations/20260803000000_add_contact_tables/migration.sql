-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dynamicUserId" TEXT,
    "notifiedAt" TIMESTAMP(3),

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactAppearance" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "demoSlug" TEXT NOT NULL,
    "prospectId" TEXT,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactAppearance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Contact_email_key" ON "Contact"("email");

-- CreateIndex
CREATE INDEX "Contact_firstSeenAt_idx" ON "Contact"("firstSeenAt");

-- CreateIndex
CREATE INDEX "ContactAppearance_prospectId_idx" ON "ContactAppearance"("prospectId");

-- CreateIndex
CREATE INDEX "ContactAppearance_demoSlug_idx" ON "ContactAppearance"("demoSlug");

-- CreateIndex
CREATE UNIQUE INDEX "ContactAppearance_contactId_demoSlug_prospectId_key" ON "ContactAppearance"("contactId", "demoSlug", "prospectId");

-- AddForeignKey
ALTER TABLE "ContactAppearance" ADD CONSTRAINT "ContactAppearance_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactAppearance" ADD CONSTRAINT "ContactAppearance_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Enable Row Level Security (enable-only, no policies; Prisma connects as the
-- privileged role and bypasses it), mirroring the gtm_tables migration.
ALTER TABLE public."Contact" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ContactAppearance" ENABLE ROW LEVEL SECURITY;

-- One-time backfill: seed Contact + ContactAppearance from existing
-- `authenticated` milestone events, excluding internal sessions. Every seeded
-- Contact is marked already-notified (notifiedAt = now()) so the backfill fires
-- ZERO Slack messages; firstSeenAt is the earliest such event so first-seen is truthful.
WITH auth_events AS (
  SELECT lower(te."props"->>'email')            AS email,
         te."props"->>'dynamicUserId'           AS dynamic_user_id,
         te."ts"                                 AS ts,
         vs."demoSlug"                           AS demo_slug,
         sl."prospectId"                         AS prospect_id
  FROM "TrackEvent" te
  JOIN "VisitorSession" vs ON vs."id" = te."sessionId"
  LEFT JOIN "ShareLink" sl ON sl."id" = vs."shareLinkId"
  WHERE te."name" = 'authenticated'
    AND te."type" = 'milestone'
    AND vs."isInternal" = false
    AND te."props"->>'email' IS NOT NULL
    AND te."props"->>'email' <> ''
    AND position('@' in te."props"->>'email') > 0
),
new_contacts AS (
  INSERT INTO "Contact" ("id", "email", "firstSeenAt", "dynamicUserId", "notifiedAt")
  SELECT gen_random_uuid()::text,
         email,
         min(ts),
         (array_agg(dynamic_user_id ORDER BY ts) FILTER (WHERE dynamic_user_id IS NOT NULL))[1],
         now()
  FROM auth_events
  GROUP BY email
  ON CONFLICT ("email") DO NOTHING
  RETURNING "id", "email"
)
INSERT INTO "ContactAppearance" ("id", "contactId", "demoSlug", "prospectId", "firstSeenAt")
SELECT gen_random_uuid()::text, c."id", a.demo_slug, a.prospect_id, min(a.ts)
FROM auth_events a
JOIN new_contacts c ON c."email" = a.email
GROUP BY c."id", a.demo_slug, a.prospect_id
ON CONFLICT DO NOTHING;
