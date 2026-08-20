CREATE TABLE "FinancialAsset" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "price" DECIMAL(14,4) NOT NULL,
    "previousPrice" DECIMAL(14,4) NOT NULL,

    CONSTRAINT "FinancialAsset_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FinancialAsset_key_key" ON "FinancialAsset"("key");

CREATE TABLE "PlayerAssetHolding" (
    "playerId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "quantity" DECIMAL(16,6) NOT NULL,
    "costBasis" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "PlayerAssetHolding_pkey" PRIMARY KEY ("playerId","assetId")
);

ALTER TABLE "PlayerAssetHolding" ADD CONSTRAINT "PlayerAssetHolding_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlayerAssetHolding" ADD CONSTRAINT "PlayerAssetHolding_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "FinancialAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
