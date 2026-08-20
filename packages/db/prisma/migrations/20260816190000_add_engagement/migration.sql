ALTER TABLE "PlayerStats"
  ADD COLUMN "dailyBonusStreak" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lastDailyBonusClaimedAt" TIMESTAMP(3);

CREATE TABLE "PlayerAchievement" (
    "playerId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerAchievement_pkey" PRIMARY KEY ("playerId", "achievementId")
);

ALTER TABLE "PlayerAchievement" ADD CONSTRAINT "PlayerAchievement_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
