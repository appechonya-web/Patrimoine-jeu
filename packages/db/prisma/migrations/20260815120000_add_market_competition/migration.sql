-- CreateTable
CREATE TABLE "SectorCompetitor" (
    "id" TEXT NOT NULL,
    "sectorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "competitiveness" DECIMAL(6,2) NOT NULL,

    CONSTRAINT "SectorCompetitor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SectorCompetitor_sectorId_name_key" ON "SectorCompetitor"("sectorId", "name");

-- AddForeignKey
ALTER TABLE "SectorCompetitor" ADD CONSTRAINT "SectorCompetitor_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "ProductCycleReport" ADD COLUMN "marketSharePercent" DECIMAL(5,2) NOT NULL DEFAULT 0;
