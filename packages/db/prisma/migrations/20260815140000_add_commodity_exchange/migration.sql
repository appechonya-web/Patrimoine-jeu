-- CreateTable
CREATE TABLE "CommodityMarket" (
    "id" TEXT NOT NULL,
    "sectorId" TEXT NOT NULL,
    "commodityReserve" DECIMAL(16,2) NOT NULL,
    "cashReserve" DECIMAL(16,2) NOT NULL,

    CONSTRAINT "CommodityMarket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommodityPriceHistory" (
    "id" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "price" DECIMAL(10,4) NOT NULL,

    CONSTRAINT "CommodityPriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerCommodityHolding" (
    "playerId" TEXT NOT NULL,
    "sectorId" TEXT NOT NULL,
    "quantity" DECIMAL(14,2) NOT NULL DEFAULT 0,

    CONSTRAINT "PlayerCommodityHolding_pkey" PRIMARY KEY ("playerId","sectorId")
);

-- CreateIndex
CREATE UNIQUE INDEX "CommodityMarket_sectorId_key" ON "CommodityMarket"("sectorId");

-- CreateIndex
CREATE UNIQUE INDEX "CommodityPriceHistory_marketId_cycleId_key" ON "CommodityPriceHistory"("marketId", "cycleId");

-- AddForeignKey
ALTER TABLE "CommodityMarket" ADD CONSTRAINT "CommodityMarket_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommodityPriceHistory" ADD CONSTRAINT "CommodityPriceHistory_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "CommodityMarket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommodityPriceHistory" ADD CONSTRAINT "CommodityPriceHistory_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "Cycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerCommodityHolding" ADD CONSTRAINT "PlayerCommodityHolding_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerCommodityHolding" ADD CONSTRAINT "PlayerCommodityHolding_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
