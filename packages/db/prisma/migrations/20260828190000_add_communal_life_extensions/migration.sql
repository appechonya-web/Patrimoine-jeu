-- Domicile fiscal (cf. domain/residence.ts) : les joueurs n'avaient aucune
-- commune de résidence, ce qui rendait Municipality.additionalTaxRate
-- totalement inerte (jamais raccordée à un calcul d'IPP, cf.
-- game-engine/cycles.ts DEFAULT_COMMUNAL_SURCHARGE_RATE). Nullable : les
-- comptes existants n'ont pas de résidence tant qu'ils n'en choisissent pas
-- une (retombent sur le taux forfaitaire par défaut, comportement inchangé).
ALTER TABLE "Player" ADD COLUMN "residenceMunicipalityId" TEXT;
ALTER TABLE "Player" ADD CONSTRAINT "Player_residenceMunicipalityId_fkey" FOREIGN KEY ("residenceMunicipalityId") REFERENCES "Municipality"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Précompte immobilier : taxe annuelle récurrente sur la valeur de chaque
-- bien possédé, prélevée à chaque cycle et versée automatiquement au fonds
-- d'infrastructure de sa commune — une boucle fiscale en plus des dons
-- volontaires existants (MunicipalityContribution).
ALTER TABLE "Municipality" ADD COLUMN "annualPropertyTaxRate" DECIMAL(5,4) NOT NULL DEFAULT 0.006;

-- Événements locaux par province (cf. domain/sectoral-events.ts) : portée
-- supplémentaire PROVINCE, en plus de RÉGIONALE et NATIONALE — le palier
-- MINEUR bascule de RÉGIONAL à PROVINCE (cf. code applicatif).
ALTER TYPE "SectoralEventScope" ADD VALUE 'PROVINCE';
ALTER TABLE "SectoralEvent" ADD COLUMN "municipalityId" TEXT;
ALTER TABLE "SectoralEvent" ADD CONSTRAINT "SectoralEvent_municipalityId_fkey" FOREIGN KEY ("municipalityId") REFERENCES "Municipality"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
