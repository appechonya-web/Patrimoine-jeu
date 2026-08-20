CREATE TYPE "CapitalRaiseStatus" AS ENUM ('OPEN', 'FUNDED', 'CANCELLED');

CREATE TABLE "CompanyCapitalRaise" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "targetAmount" DECIMAL(12,2) NOT NULL,
    "newSharePercentage" DECIMAL(6,2) NOT NULL,
    "status" "CapitalRaiseStatus" NOT NULL DEFAULT 'OPEN',
    "investorId" TEXT,
    "createdCycle" INTEGER NOT NULL,
    "expiresCycle" INTEGER NOT NULL,

    CONSTRAINT "CompanyCapitalRaise_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "CompanyCapitalRaise" ADD CONSTRAINT "CompanyCapitalRaise_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
