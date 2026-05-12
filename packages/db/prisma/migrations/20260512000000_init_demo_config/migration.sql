-- CreateTable
CREATE TABLE "DemoConfig" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "brandId" TEXT NOT NULL,
    "themeOverrides" JSONB,
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DemoConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DemoConfig_ownerId_idx" ON "DemoConfig"("ownerId");

-- CreateIndex
CREATE INDEX "DemoConfig_brandId_idx" ON "DemoConfig"("brandId");

-- CreateIndex
CREATE INDEX "DemoConfig_kind_idx" ON "DemoConfig"("kind");

-- CreateIndex
CREATE INDEX "DemoConfig_ownerId_kind_idx" ON "DemoConfig"("ownerId", "kind");

-- AddForeignKey
ALTER TABLE "DemoConfig" ADD CONSTRAINT "DemoConfig_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- Phase 2 RLS hardening — Prisma connects as superuser and bypasses RLS,
-- but we enable it on every public table so a future Supabase-anon-key
-- consumer doesn't accidentally read these rows. Policies will be added
-- per-table when (and only when) anon-role access becomes a real need.
ALTER TABLE public."DemoConfig" ENABLE ROW LEVEL SECURITY;
