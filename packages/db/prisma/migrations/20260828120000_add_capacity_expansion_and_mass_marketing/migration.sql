-- Deux nouveaux puits de dépense d'entreprise SANS plafond par action ni
-- cooldown (contrairement aux 10 leviers classiques) : l'expansion de
-- capacité (permanente) et la campagne marketing de masse (temporaire).

ALTER TABLE "Company" ADD COLUMN "capacityExpansionInvestment" DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE "Company" ADD COLUMN "massMarketingBoostMagnitude" DECIMAL(6,4) NOT NULL DEFAULT 0;
ALTER TABLE "Company" ADD COLUMN "massMarketingBoostExpiresCycle" INTEGER;
