-- AlterTable
ALTER TABLE "Company"
  ADD COLUMN "cumulativeNetProfit" DECIMAL(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN "foundedCycle" INTEGER,
  ADD COLUMN "hasManager" BOOLEAN NOT NULL DEFAULT false;

-- Backfill existing companies (pre-dates maturity tracking): approximate
-- foundedCycle with the currently open cycle, and recompute cumulative net
-- profit from the CompanyCycleReport history already recorded.
UPDATE "Company" c
SET "foundedCycle" = COALESCE((SELECT number FROM "Cycle" WHERE status = 'OPEN' LIMIT 1), 1),
    "cumulativeNetProfit" = COALESCE(
      (SELECT SUM(r.profit - r."taxPaid") FROM "CompanyCycleReport" r WHERE r."companyId" = c.id),
      0
    )
WHERE c."foundedCycle" IS NULL;

ALTER TABLE "Company" ALTER COLUMN "foundedCycle" SET NOT NULL;
