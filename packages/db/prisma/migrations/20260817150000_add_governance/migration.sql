CREATE TYPE "ProposalType" AS ENUM ('SET_DISTRIBUTION_POLICY', 'INVEST');
CREATE TYPE "ProposalStatus" AS ENUM ('OPEN', 'APPROVED', 'REJECTED');

CREATE TABLE "CompanyProposal" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "proposerId" TEXT NOT NULL,
    "type" "ProposalType" NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "ProposalStatus" NOT NULL DEFAULT 'OPEN',
    "createdCycle" INTEGER NOT NULL,
    "expiresCycle" INTEGER NOT NULL,

    CONSTRAINT "CompanyProposal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CompanyProposalVote" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,
    "inFavor" BOOLEAN NOT NULL,
    "sharePercentage" DECIMAL(6,2) NOT NULL,
    "createdCycle" INTEGER NOT NULL,

    CONSTRAINT "CompanyProposalVote_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CompanyProposalVote_proposalId_voterId_key" ON "CompanyProposalVote"("proposalId", "voterId");

ALTER TABLE "CompanyProposal" ADD CONSTRAINT "CompanyProposal_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CompanyProposalVote" ADD CONSTRAINT "CompanyProposalVote_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "CompanyProposal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
