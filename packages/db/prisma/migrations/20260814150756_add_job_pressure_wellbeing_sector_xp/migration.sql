-- AlterTable
ALTER TABLE "Employment" ADD COLUMN     "jobId" TEXT;

-- CreateTable
CREATE TABLE "PlayerSectorExperience" (
    "playerId" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "cycles" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PlayerSectorExperience_pkey" PRIMARY KEY ("playerId","sector")
);

-- AddForeignKey
ALTER TABLE "PlayerSectorExperience" ADD CONSTRAINT "PlayerSectorExperience_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill jobId from the pre-existing free-text `role` column, matching the
-- NPC_JOBS catalog titles (packages/domain/src/employment.ts) at the time
-- this migration was written.
UPDATE "Employment" SET "jobId" = CASE "role"
  WHEN 'Ouvrier de production' THEN 'ouvrier'
  WHEN 'Employé de bureau' THEN 'employe-bureau'
  WHEN 'Infirmier' THEN 'infirmier'
  WHEN 'Développeur logiciel' THEN 'developpeur'
  WHEN 'Ingénieur' THEN 'ingenieur'
  WHEN 'Cadre commercial' THEN 'cadre-commercial'
  ELSE NULL
END
WHERE "jobId" IS NULL;

-- Backfill PlayerSectorExperience from employment history so existing
-- players don't lose the sector tolerance/reconversion benefit they've
-- already earned by playing. Still-open employments count up to the
-- currently open cycle.
INSERT INTO "PlayerSectorExperience" ("playerId", "sector", "cycles")
SELECT
  e."playerId",
  sector,
  SUM(GREATEST(0, COALESCE(e."endedCycle", (SELECT number FROM "Cycle" WHERE status = 'OPEN' LIMIT 1)) - e."startedCycle"))
FROM "Employment" e,
LATERAL (
  SELECT CASE e."jobId"
    WHEN 'ouvrier' THEN 'Industrie'
    WHEN 'employe-bureau' THEN 'Services'
    WHEN 'infirmier' THEN 'Santé'
    WHEN 'developpeur' THEN 'Technologie'
    WHEN 'ingenieur' THEN 'Industrie'
    WHEN 'cadre-commercial' THEN 'Services'
  END AS sector
) mapped
WHERE mapped.sector IS NOT NULL
GROUP BY e."playerId", sector
ON CONFLICT ("playerId", "sector") DO UPDATE SET "cycles" = "PlayerSectorExperience"."cycles" + EXCLUDED."cycles";
