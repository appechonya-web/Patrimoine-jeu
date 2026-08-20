CREATE TYPE "SectoralEventTier" AS ENUM ('MINOR', 'MODERATE', 'MAJOR', 'EXCEPTIONAL');
CREATE TYPE "SectoralEventScope" AS ENUM ('REGIONAL', 'NATIONAL');
CREATE TYPE "InsurancePolicyStatus" AS ENUM ('OPEN', 'ACTIVE', 'CANCELLED', 'LAPSED');

CREATE TABLE "SectoralEvent" (
    "id" TEXT NOT NULL,
    "tier" "SectoralEventTier" NOT NULL,
    "scope" "SectoralEventScope" NOT NULL,
    "regionId" TEXT,
    "primarySectorId" TEXT NOT NULL,
    "primaryMagnitude" DECIMAL(6,4) NOT NULL,
    "correlatedSectorId" TEXT,
    "correlatedMagnitude" DECIMAL(6,4),
    "createdCycle" INTEGER NOT NULL,
    "startCycle" INTEGER NOT NULL,
    "endCycle" INTEGER NOT NULL,
    "impactPublishedCycle" INTEGER,

    CONSTRAINT "SectoralEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InsurancePolicy" (
    "id" TEXT NOT NULL,
    "insurerCompanyId" TEXT,
    "insuredCompanyId" TEXT,
    "premiumPerCycle" DECIMAL(10,2) NOT NULL,
    "coverageCap" DECIMAL(12,2) NOT NULL,
    "status" "InsurancePolicyStatus" NOT NULL DEFAULT 'OPEN',
    "createdCycle" INTEGER NOT NULL,
    "startedCycle" INTEGER,

    CONSTRAINT "InsurancePolicy_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "SectoralEvent" ADD CONSTRAINT "SectoralEvent_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SectoralEvent" ADD CONSTRAINT "SectoralEvent_primarySectorId_fkey" FOREIGN KEY ("primarySectorId") REFERENCES "Sector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SectoralEvent" ADD CONSTRAINT "SectoralEvent_correlatedSectorId_fkey" FOREIGN KEY ("correlatedSectorId") REFERENCES "Sector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InsurancePolicy" ADD CONSTRAINT "InsurancePolicy_insurerCompanyId_fkey" FOREIGN KEY ("insurerCompanyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InsurancePolicy" ADD CONSTRAINT "InsurancePolicy_insuredCompanyId_fkey" FOREIGN KEY ("insuredCompanyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
