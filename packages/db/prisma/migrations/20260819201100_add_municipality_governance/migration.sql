ALTER TYPE "PressCategory" ADD VALUE 'COUNCIL_DECISION';

ALTER TABLE "Municipality" ADD COLUMN "infrastructureFund" DECIMAL(14,2) NOT NULL DEFAULT 0;

CREATE TABLE "MunicipalityContribution" (
    "id" TEXT NOT NULL,
    "municipalityId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "createdCycle" INTEGER NOT NULL,

    CONSTRAINT "MunicipalityContribution_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MunicipalityContribution_municipalityId_playerId_key" ON "MunicipalityContribution"("municipalityId", "playerId");

ALTER TABLE "MunicipalityContribution" ADD CONSTRAINT "MunicipalityContribution_municipalityId_fkey" FOREIGN KEY ("municipalityId") REFERENCES "Municipality"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TYPE "CouncilProposalStatus" AS ENUM ('OPEN', 'APPROVED', 'REJECTED');

CREATE TABLE "MunicipalityProposal" (
    "id" TEXT NOT NULL,
    "municipalityId" TEXT NOT NULL,
    "proposerId" TEXT NOT NULL,
    "newAdditionalTaxRate" DECIMAL(5,4) NOT NULL,
    "status" "CouncilProposalStatus" NOT NULL DEFAULT 'OPEN',
    "createdCycle" INTEGER NOT NULL,
    "expiresCycle" INTEGER NOT NULL,

    CONSTRAINT "MunicipalityProposal_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "MunicipalityProposal" ADD CONSTRAINT "MunicipalityProposal_municipalityId_fkey" FOREIGN KEY ("municipalityId") REFERENCES "Municipality"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "MunicipalityProposalVote" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,
    "inFavor" BOOLEAN NOT NULL,
    "weight" DECIMAL(12,2) NOT NULL,
    "createdCycle" INTEGER NOT NULL,

    CONSTRAINT "MunicipalityProposalVote_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MunicipalityProposalVote_proposalId_voterId_key" ON "MunicipalityProposalVote"("proposalId", "voterId");

ALTER TABLE "MunicipalityProposalVote" ADD CONSTRAINT "MunicipalityProposalVote_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "MunicipalityProposal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
