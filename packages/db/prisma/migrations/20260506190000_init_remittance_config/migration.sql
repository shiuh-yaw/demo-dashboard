-- CreateTable
CREATE TABLE "RemittanceConfig" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "brandId" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RemittanceConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RemittanceConfig_ownerId_idx" ON "RemittanceConfig"("ownerId");

-- CreateIndex
CREATE INDEX "RemittanceConfig_brandId_idx" ON "RemittanceConfig"("brandId");

-- AddForeignKey
ALTER TABLE "RemittanceConfig" ADD CONSTRAINT "RemittanceConfig_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- Phase 2 RLS hardening — Prisma connects as superuser and bypasses RLS,
-- but we enable it on every public table so a future Supabase-anon-key
-- consumer doesn't accidentally read these rows. Policies will be added
-- per-table when (and only when) anon-role access becomes a real need.
ALTER TABLE public."RemittanceConfig" ENABLE ROW LEVEL SECURITY;
