-- AlterTable: add tiered employee counters
ALTER TABLE "Company"
  ADD COLUMN "unskilledEmployeeCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "qualifiedEmployeeCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "specialistEmployeeCount" INTEGER NOT NULL DEFAULT 0;

-- Backfill: existing flat-tier employees become "unskilled" (cheapest tier,
-- the safest assumption since qualification wasn't tracked before).
UPDATE "Company" SET "unskilledEmployeeCount" = "employeeCount" WHERE "employeeCount" > 0;

ALTER TABLE "Company" DROP COLUMN "employeeCount";

-- CreateTable
CREATE TABLE "CompanyActionCooldown" (
    "companyId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "lastCycle" INTEGER NOT NULL,

    CONSTRAINT "CompanyActionCooldown_pkey" PRIMARY KEY ("companyId","actionType")
);

-- AddForeignKey
ALTER TABLE "CompanyActionCooldown" ADD CONSTRAINT "CompanyActionCooldown_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
