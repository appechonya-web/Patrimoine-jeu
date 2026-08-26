CREATE TABLE "PlayerCycleReportLine" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "grossAmount" DECIMAL(14,2),
    "taxAmount" DECIMAL(14,2),
    "netAmount" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "PlayerCycleReportLine_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PlayerCycleReportLine_playerId_cycleId_category_idx" ON "PlayerCycleReportLine"("playerId", "cycleId", "category");

ALTER TABLE "PlayerCycleReportLine" ADD CONSTRAINT "PlayerCycleReportLine_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PlayerCycleReportLine" ADD CONSTRAINT "PlayerCycleReportLine_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "Cycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
