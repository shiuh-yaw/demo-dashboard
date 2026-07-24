-- CreateIndex
CREATE INDEX "ShareLink_prospectId_idx" ON "ShareLink"("prospectId");

-- CreateIndex
CREATE INDEX "ShareLink_demoConfigId_idx" ON "ShareLink"("demoConfigId");

-- CreateIndex
CREATE INDEX "VisitorSession_isInternal_startedAt_idx" ON "VisitorSession"("isInternal", "startedAt");
