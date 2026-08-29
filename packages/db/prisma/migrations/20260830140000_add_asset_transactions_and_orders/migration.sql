-- Historique personnel des transactions + ordres à cours déclenché
-- (cf. domain/financial-assets.ts).

CREATE TYPE "AssetTransactionType" AS ENUM ('BUY', 'SELL');
CREATE TYPE "AssetOrderDirection" AS ENUM ('BUY', 'SELL');
CREATE TYPE "AssetOrderCondition" AS ENUM ('ABOVE', 'BELOW');
CREATE TYPE "AssetOrderStatus" AS ENUM ('OPEN', 'FILLED', 'CANCELLED');

CREATE TABLE "FinancialAssetTransaction" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "type" "AssetTransactionType" NOT NULL,
    "quantity" DECIMAL(16,6) NOT NULL,
    "price" DECIMAL(14,4) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "gain" DECIMAL(14,2),
    "tax" DECIMAL(14,2),
    "cycleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancialAssetTransaction_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "FinancialAssetTransaction" ADD CONSTRAINT "FinancialAssetTransaction_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinancialAssetTransaction" ADD CONSTRAINT "FinancialAssetTransaction_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "FinancialAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinancialAssetTransaction" ADD CONSTRAINT "FinancialAssetTransaction_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "Cycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "FinancialAssetTransaction_playerId_createdAt_idx" ON "FinancialAssetTransaction"("playerId", "createdAt");

CREATE TABLE "FinancialAssetOrder" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "direction" "AssetOrderDirection" NOT NULL,
    "condition" "AssetOrderCondition" NOT NULL,
    "triggerPrice" DECIMAL(14,4) NOT NULL,
    "amount" DECIMAL(14,2),
    "quantity" DECIMAL(16,6),
    "status" "AssetOrderStatus" NOT NULL DEFAULT 'OPEN',
    "createdCycle" INTEGER NOT NULL,
    "filledCycle" INTEGER,

    CONSTRAINT "FinancialAssetOrder_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "FinancialAssetOrder" ADD CONSTRAINT "FinancialAssetOrder_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinancialAssetOrder" ADD CONSTRAINT "FinancialAssetOrder_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "FinancialAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "FinancialAssetOrder_assetId_status_idx" ON "FinancialAssetOrder"("assetId", "status");
CREATE INDEX "FinancialAssetOrder_playerId_status_idx" ON "FinancialAssetOrder"("playerId", "status");
