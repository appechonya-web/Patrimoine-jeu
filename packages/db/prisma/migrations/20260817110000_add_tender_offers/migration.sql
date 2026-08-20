CREATE TYPE "TenderOfferStatus" AS ENUM ('OPEN', 'COMPLETED', 'CANCELLED');

CREATE TABLE "CompanyTenderOffer" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "acquirerPlayerId" TEXT NOT NULL,
    "pricePerPercent" DECIMAL(12,2) NOT NULL,
    "status" "TenderOfferStatus" NOT NULL DEFAULT 'OPEN',
    "createdCycle" INTEGER NOT NULL,
    "expiresCycle" INTEGER NOT NULL,

    CONSTRAINT "CompanyTenderOffer_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "CompanyTenderOffer" ADD CONSTRAINT "CompanyTenderOffer_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
