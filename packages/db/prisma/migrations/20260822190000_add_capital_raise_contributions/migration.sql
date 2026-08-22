ALTER TABLE "CompanyCapitalRaise" ADD COLUMN "amountRaised" DECIMAL(12,2) NOT NULL DEFAULT 0;

CREATE TABLE "CapitalRaiseContribution" (
    "id" TEXT NOT NULL,
    "raiseId" TEXT NOT NULL,
    "investorId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "sharePercentage" DECIMAL(6,2) NOT NULL,
    "cycle" INTEGER NOT NULL,

    CONSTRAINT "CapitalRaiseContribution_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CapitalRaiseContribution_raiseId_investorId_key" ON "CapitalRaiseContribution"("raiseId", "investorId");

ALTER TABLE "CapitalRaiseContribution" ADD CONSTRAINT "CapitalRaiseContribution_raiseId_fkey" FOREIGN KEY ("raiseId") REFERENCES "CompanyCapitalRaise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CapitalRaiseContribution" ADD CONSTRAINT "CapitalRaiseContribution_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
