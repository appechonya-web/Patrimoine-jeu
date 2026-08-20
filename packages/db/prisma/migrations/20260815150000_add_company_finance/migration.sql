-- AlterTable
ALTER TABLE "Company" ADD COLUMN "equipmentAccumulatedDepreciation" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "CompanyLoan" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "principal" DECIMAL(12,2) NOT NULL,
    "rate" DECIMAL(6,4) NOT NULL,
    "termCycles" INTEGER NOT NULL,
    "remainingBalance" DECIMAL(12,2) NOT NULL,
    "status" "LoanStatus" NOT NULL DEFAULT 'ACTIVE',
    "originatedCycle" INTEGER NOT NULL,

    CONSTRAINT "CompanyLoan_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CompanyLoan" ADD CONSTRAINT "CompanyLoan_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
