-- Municipality.population doit accumuler une croissance FRACTIONNAIRE
-- chaque cycle (cf. game-engine/municipality.ts computePopulationGrowthPerCycle)
-- — un entier tronquerait silencieusement la quasi-totalité de la
-- croissance à 0 cycle après cycle, comme cashReserve/infrastructureFund
-- ailleurs dans ce schéma, jamais un entier pour cette raison précise.
ALTER TABLE "Municipality" ALTER COLUMN "population" TYPE DECIMAL(14,2) USING "population"::DECIMAL(14,2);
ALTER TABLE "Municipality" ALTER COLUMN "population" SET DEFAULT 0;
