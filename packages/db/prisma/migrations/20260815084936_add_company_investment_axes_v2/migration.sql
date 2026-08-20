-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "automationInvestment" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "brandingInvestment" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "innovationInvestment" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "insuranceInvestment" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "safetyInvestment" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "trainingInvestment" DECIMAL(12,2) NOT NULL DEFAULT 0;
