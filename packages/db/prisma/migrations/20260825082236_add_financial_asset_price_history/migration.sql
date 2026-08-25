CREATE TABLE "FinancialAssetPriceHistory" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "price" DECIMAL(14,4) NOT NULL,

    CONSTRAINT "FinancialAssetPriceHistory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FinancialAssetPriceHistory_assetId_cycleId_key" ON "FinancialAssetPriceHistory"("assetId", "cycleId");

ALTER TABLE "FinancialAssetPriceHistory" ADD CONSTRAINT "FinancialAssetPriceHistory_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "FinancialAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FinancialAssetPriceHistory" ADD CONSTRAINT "FinancialAssetPriceHistory_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "Cycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
