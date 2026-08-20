CREATE TYPE "CompanySaleListingStatus" AS ENUM ('OPEN', 'SOLD', 'CANCELLED');
CREATE TYPE "CompanySaleBidStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');

CREATE TABLE "CompanySaleListing" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "sharePercentage" DECIMAL(6,2) NOT NULL,
    "askingPricePerPercent" DECIMAL(12,2),
    "status" "CompanySaleListingStatus" NOT NULL DEFAULT 'OPEN',
    "createdCycle" INTEGER NOT NULL,
    "expiresCycle" INTEGER NOT NULL,

    CONSTRAINT "CompanySaleListing_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CompanySaleBid" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "pricePerPercent" DECIMAL(12,2) NOT NULL,
    "status" "CompanySaleBidStatus" NOT NULL DEFAULT 'PENDING',
    "createdCycle" INTEGER NOT NULL,

    CONSTRAINT "CompanySaleBid_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "CompanySaleListing" ADD CONSTRAINT "CompanySaleListing_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CompanySaleBid" ADD CONSTRAINT "CompanySaleBid_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "CompanySaleListing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
