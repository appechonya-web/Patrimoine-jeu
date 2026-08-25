CREATE TABLE "PlayerCycleReport" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "salaryIncome" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "independentActivityIncome" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "dividendIncome" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "rentIncome" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "mortgagePayment" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "lifeEventDelta" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "assetDividendCashIncome" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "assetDividendReinvestedValue" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "savingsInterestAccrued" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "achievementReward" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "bankFailurePayout" DECIMAL(14,2) NOT NULL DEFAULT 0,

    CONSTRAINT "PlayerCycleReport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlayerCycleReport_playerId_cycleId_key" ON "PlayerCycleReport"("playerId", "cycleId");

ALTER TABLE "PlayerCycleReport" ADD CONSTRAINT "PlayerCycleReport_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PlayerCycleReport" ADD CONSTRAINT "PlayerCycleReport_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "Cycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
