-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "cashReserve" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "equipmentInvestment" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "workConditionsInvestment" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "CompanyCycleReport" ADD COLUMN     "eventLabel" TEXT;
