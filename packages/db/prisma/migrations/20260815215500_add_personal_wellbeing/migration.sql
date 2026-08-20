ALTER TABLE "PlayerStats"
  ADD COLUMN "sportInvestment" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "nutritionInvestment" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "socialInvestment" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "comfortInvestment" DECIMAL(12,2) NOT NULL DEFAULT 0;

CREATE TABLE "PlayerActionCooldown" (
  "playerId" TEXT NOT NULL,
  "actionType" TEXT NOT NULL,
  "lastCycle" INTEGER NOT NULL,
  CONSTRAINT "PlayerActionCooldown_pkey" PRIMARY KEY ("playerId", "actionType")
);

ALTER TABLE "PlayerActionCooldown"
  ADD CONSTRAINT "PlayerActionCooldown_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
