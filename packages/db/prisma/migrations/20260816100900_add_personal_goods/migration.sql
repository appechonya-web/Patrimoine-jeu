CREATE TABLE "PersonalGood" (
  "id" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "goodId" TEXT NOT NULL,
  "purchasePrice" DECIMAL(12,2) NOT NULL,
  "purchasedCycle" INTEGER NOT NULL,
  "soldCycle" INTEGER,
  CONSTRAINT "PersonalGood_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "PersonalGood"
  ADD CONSTRAINT "PersonalGood_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
