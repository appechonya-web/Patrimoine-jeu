-- Détail ligne par ligne de ce qui fait bouger le bien-être à chaque cycle
-- (cf. domain/personal.ts, game-engine/cycles.ts) — même principe que
-- PlayerCycleReportLine pour le patrimoine.
CREATE TABLE "PlayerWellbeingCycleLine" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "delta" DECIMAL(6,3) NOT NULL,

    CONSTRAINT "PlayerWellbeingCycleLine_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlayerWellbeingCycleLine_playerId_cycleId_category_sourceI_key" ON "PlayerWellbeingCycleLine"("playerId", "cycleId", "category", "sourceId");

ALTER TABLE "PlayerWellbeingCycleLine" ADD CONSTRAINT "PlayerWellbeingCycleLine_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlayerWellbeingCycleLine" ADD CONSTRAINT "PlayerWellbeingCycleLine_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "Cycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
