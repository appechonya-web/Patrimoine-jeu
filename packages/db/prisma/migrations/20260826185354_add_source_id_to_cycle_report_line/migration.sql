ALTER TABLE "PlayerCycleReportLine" ADD COLUMN "sourceId" TEXT;

DROP INDEX "PlayerCycleReportLine_playerId_cycleId_category_idx";

CREATE UNIQUE INDEX "PlayerCycleReportLine_playerId_cycleId_category_sourceId_key" ON "PlayerCycleReportLine"("playerId", "cycleId", "category", "sourceId");
