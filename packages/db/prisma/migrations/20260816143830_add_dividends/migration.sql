ALTER TABLE "Company"
  ADD COLUMN "distributionPolicy" TEXT NOT NULL DEFAULT 'dividend',
  ADD COLUMN "liquidationReserve" DECIMAL(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN "liquidationReserveSinceCycle" INTEGER;
