-- Groupe/holding : une entreprise peut désormais détenir des parts d'une
-- autre entreprise (CompanyShare.holderCompanyId), en plus des joueurs
-- (CompanyShare.playerId, maintenant nullable). Exactement l'un des deux
-- doit être renseigné (cf. contrainte CHECK ci-dessous).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Remplace la PK composite (companyId, playerId) par un id de substitution,
-- nécessaire puisque playerId devient nullable et ne peut plus faire partie
-- d'une clé primaire.
ALTER TABLE "CompanyShare" ADD COLUMN "id" TEXT;
UPDATE "CompanyShare" SET "id" = gen_random_uuid()::text WHERE "id" IS NULL;
ALTER TABLE "CompanyShare" ALTER COLUMN "id" SET NOT NULL;

ALTER TABLE "CompanyShare" DROP CONSTRAINT "CompanyShare_pkey";
ALTER TABLE "CompanyShare" ADD CONSTRAINT "CompanyShare_pkey" PRIMARY KEY ("id");

ALTER TABLE "CompanyShare" ALTER COLUMN "playerId" DROP NOT NULL;
ALTER TABLE "CompanyShare" ADD COLUMN "holderCompanyId" TEXT;

ALTER TABLE "CompanyShare" ADD CONSTRAINT "CompanyShare_holderCompanyId_fkey" FOREIGN KEY ("holderCompanyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "CompanyShare_companyId_playerId_key" ON "CompanyShare"("companyId", "playerId");
CREATE UNIQUE INDEX "CompanyShare_companyId_holderCompanyId_key" ON "CompanyShare"("companyId", "holderCompanyId");

ALTER TABLE "CompanyShare" ADD CONSTRAINT "CompanyShare_holder_check" CHECK ((("playerId" IS NOT NULL)::int + ("holderCompanyId" IS NOT NULL)::int) = 1);

-- Rachats inter-entreprises : les 4 mécanismes existants (OPA, rachat
-- amical, capital-risque, cotation libre) peuvent désormais être exercés
-- pour le compte d'une entreprise contrôlée par le joueur (payée par SA
-- trésorerie) plutôt qu'en son nom propre.

ALTER TABLE "CompanyTenderOffer" ALTER COLUMN "acquirerPlayerId" DROP NOT NULL;
ALTER TABLE "CompanyTenderOffer" ADD COLUMN "acquirerCompanyId" TEXT;

ALTER TABLE "CompanySaleBid" ALTER COLUMN "buyerId" DROP NOT NULL;
ALTER TABLE "CompanySaleBid" ADD COLUMN "buyerCompanyId" TEXT;

ALTER TABLE "CompanyShareListing" ADD COLUMN "buyerCompanyId" TEXT;
ALTER TABLE "CompanyShareListing" ADD CONSTRAINT "CompanyShareListing_buyerCompanyId_fkey" FOREIGN KEY ("buyerCompanyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CapitalRaiseContribution" ALTER COLUMN "investorId" DROP NOT NULL;
ALTER TABLE "CapitalRaiseContribution" ADD COLUMN "investorCompanyId" TEXT;
ALTER TABLE "CapitalRaiseContribution" ADD CONSTRAINT "CapitalRaiseContribution_investorCompanyId_fkey" FOREIGN KEY ("investorCompanyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE UNIQUE INDEX "CapitalRaiseContribution_raiseId_investorCompanyId_key" ON "CapitalRaiseContribution"("raiseId", "investorCompanyId");
