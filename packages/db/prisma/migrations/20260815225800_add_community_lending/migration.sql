CREATE TABLE "LoanOffer" (
  "id" TEXT NOT NULL,
  "lenderCompanyId" TEXT NOT NULL,
  "principal" DECIMAL(12,2) NOT NULL,
  "rate" DECIMAL(6,4) NOT NULL,
  "termCycles" INTEGER NOT NULL,
  "createdCycle" INTEGER NOT NULL,
  CONSTRAINT "LoanOffer_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "LoanOffer"
  ADD CONSTRAINT "LoanOffer_lenderCompanyId_fkey" FOREIGN KEY ("lenderCompanyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
