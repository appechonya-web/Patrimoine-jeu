-- CreateTable
CREATE TABLE "CompanyProduct" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "capacityAllocation" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "stockUnits" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "launchedCycle" INTEGER NOT NULL,

    CONSTRAINT "CompanyProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCycleReport" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "unitsProduced" DECIMAL(12,2) NOT NULL,
    "unitsSold" DECIMAL(12,2) NOT NULL,
    "unitsLost" DECIMAL(12,2) NOT NULL,
    "stockUnits" DECIMAL(12,2) NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "unitCost" DECIMAL(10,2) NOT NULL,
    "revenue" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "ProductCycleReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompanyProduct_companyId_type_key" ON "CompanyProduct"("companyId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCycleReport_productId_cycleId_key" ON "ProductCycleReport"("productId", "cycleId");

-- AddForeignKey
ALTER TABLE "CompanyProduct" ADD CONSTRAINT "CompanyProduct_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCycleReport" ADD CONSTRAINT "ProductCycleReport_productId_fkey" FOREIGN KEY ("productId") REFERENCES "CompanyProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCycleReport" ADD CONSTRAINT "ProductCycleReport_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "Cycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill: chaque entreprise existante obtient sa gamme "core" (100% de la
-- capacité), reprenant son ancien prix/stock au niveau Company, avant que ces
-- colonnes ne soient supprimées de Company ci-dessous.
INSERT INTO "CompanyProduct" ("id", "companyId", "type", "unitPrice", "capacityAllocation", "stockUnits", "launchedCycle")
SELECT gen_random_uuid(), "id", 'core', "unitPrice", 100, "stockUnits", "foundedCycle"
FROM "Company";

-- AlterTable
ALTER TABLE "Company" DROP COLUMN "stockUnits",
DROP COLUMN "unitPrice";

-- AlterTable
ALTER TABLE "CompanyCycleReport" DROP COLUMN "unitCost",
DROP COLUMN "unitPrice";
