CREATE TABLE "CauseDonation" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "causeId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "donatedCycle" INTEGER NOT NULL,

    CONSTRAINT "CauseDonation_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "CauseDonation" ADD CONSTRAINT "CauseDonation_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
