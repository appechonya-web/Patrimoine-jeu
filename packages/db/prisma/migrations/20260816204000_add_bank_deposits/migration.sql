ALTER TABLE "Company" ADD COLUMN "depositRate" DECIMAL(5,4) NOT NULL DEFAULT 0.02;

CREATE TABLE "BankDeposit" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "principal" DECIMAL(14,2) NOT NULL,
    "balance" DECIMAL(14,2) NOT NULL,
    "rate" DECIMAL(5,4) NOT NULL,
    "depositedCycle" INTEGER NOT NULL,
    "withdrawnCycle" INTEGER,

    CONSTRAINT "BankDeposit_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "BankDeposit" ADD CONSTRAINT "BankDeposit_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BankDeposit" ADD CONSTRAINT "BankDeposit_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
