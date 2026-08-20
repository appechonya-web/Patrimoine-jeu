CREATE TABLE "PlayerNotification" (
  "id" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "cycle" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "readAt" TIMESTAMP(3),
  CONSTRAINT "PlayerNotification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PlayerNotification_playerId_createdAt_idx" ON "PlayerNotification"("playerId", "createdAt");

ALTER TABLE "PlayerNotification"
  ADD CONSTRAINT "PlayerNotification_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
