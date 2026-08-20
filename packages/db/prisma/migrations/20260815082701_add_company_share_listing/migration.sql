-- CreateEnum
CREATE TYPE "ShareListingStatus" AS ENUM ('OPEN', 'SOLD', 'CANCELLED');

-- CreateTable
CREATE TABLE "CompanyShareListing" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "buyerId" TEXT,
    "sharePercentage" DECIMAL(5,2) NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "status" "ShareListingStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "soldAt" TIMESTAMP(3),

    CONSTRAINT "CompanyShareListing_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CompanyShareListing" ADD CONSTRAINT "CompanyShareListing_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyShareListing" ADD CONSTRAINT "CompanyShareListing_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyShareListing" ADD CONSTRAINT "CompanyShareListing_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
