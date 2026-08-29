-- Placement de trésorerie d'entreprise (cf. domain/company-treasury.ts) —
-- un bucket séparé de cashReserve, alimenté/retiré par action explicite,
-- qui rapporte un revenu passif au lieu de dormir sans rien rapporter.
ALTER TABLE "Company" ADD COLUMN "treasuryInvestment" DECIMAL(14,2) NOT NULL DEFAULT 0;

-- Astuce heuristique par cycle (cf. game-engine/company-insights.ts).
ALTER TABLE "CompanyCycleReport" ADD COLUMN "tip" TEXT;

-- Détail ligne par ligne d'une catégorie de CompanyCycleReport — même
-- principe que PlayerCycleReportLine côté joueur.
CREATE TABLE "CompanyCycleReportLine" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "netAmount" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "CompanyCycleReportLine_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CompanyCycleReportLine_companyId_cycleId_category_sourceId_key" ON "CompanyCycleReportLine"("companyId", "cycleId", "category", "sourceId");

ALTER TABLE "CompanyCycleReportLine" ADD CONSTRAINT "CompanyCycleReportLine_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CompanyCycleReportLine" ADD CONSTRAINT "CompanyCycleReportLine_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "Cycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
