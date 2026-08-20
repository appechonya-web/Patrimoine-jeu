CREATE TABLE "IndependentActivity" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "grossRevenuePerCycle" DECIMAL(10,2) NOT NULL,
    "startedCycle" INTEGER NOT NULL,

    CONSTRAINT "IndependentActivity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IndependentActivity_playerId_key" ON "IndependentActivity"("playerId");

ALTER TABLE "IndependentActivity" ADD CONSTRAINT "IndependentActivity_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
