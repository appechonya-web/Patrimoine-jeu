CREATE TYPE "CompanyJobPostingStatus" AS ENUM ('OPEN', 'FILLED', 'CLOSED');

CREATE TABLE "CompanyJobPosting" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "salary" DECIMAL(10,2) NOT NULL,
    "pressure" INTEGER NOT NULL,
    "status" "CompanyJobPostingStatus" NOT NULL DEFAULT 'OPEN',
    "createdCycle" INTEGER NOT NULL,

    CONSTRAINT "CompanyJobPosting_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "CompanyJobPosting" ADD CONSTRAINT "CompanyJobPosting_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Employment" ADD COLUMN "pressure" INTEGER;
ALTER TABLE "Employment" ADD COLUMN "postingId" TEXT;
