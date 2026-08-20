ALTER TABLE "PlayerStats"
  ADD COLUMN "cumulativeInvestmentGains" DECIMAL(14,2) NOT NULL DEFAULT 0;

CREATE TABLE "SavingsAccount" (
  "id" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "productType" TEXT NOT NULL,
  "principal" DECIMAL(14,2) NOT NULL,
  "balance" DECIMAL(14,2) NOT NULL,
  "rate" DECIMAL(5,4) NOT NULL,
  "termCycles" INTEGER NOT NULL,
  "openedCycle" INTEGER NOT NULL,
  "withdrawnCycle" INTEGER,
  CONSTRAINT "SavingsAccount_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "SavingsAccount"
  ADD CONSTRAINT "SavingsAccount_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
