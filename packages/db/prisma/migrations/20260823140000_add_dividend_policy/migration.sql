CREATE TYPE "DividendPolicy" AS ENUM ('CASH', 'REINVEST');

ALTER TABLE "PlayerAssetHolding" ADD COLUMN "dividendPolicy" "DividendPolicy" NOT NULL DEFAULT 'CASH';
