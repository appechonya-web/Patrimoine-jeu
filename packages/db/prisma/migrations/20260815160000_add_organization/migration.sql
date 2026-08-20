-- CreateTable
CREATE TABLE "CompanyDepartment" (
    "companyId" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "hasManager" BOOLEAN NOT NULL DEFAULT false,
    "morale" DECIMAL(5,2) NOT NULL DEFAULT 50,

    CONSTRAINT "CompanyDepartment_pkey" PRIMARY KEY ("companyId","department")
);

-- CreateTable
CREATE TABLE "CompanyEmployeeCount" (
    "companyId" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CompanyEmployeeCount_pkey" PRIMARY KEY ("companyId","department","tier")
);

-- AddForeignKey
ALTER TABLE "CompanyDepartment" ADD CONSTRAINT "CompanyDepartment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyEmployeeCount" ADD CONSTRAINT "CompanyEmployeeCount_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill: 4 départements par entreprise existante, moral neutre par défaut.
INSERT INTO "CompanyDepartment" ("companyId", "department", "hasManager", "morale")
SELECT c.id, d.department, false, 50
FROM "Company" c
CROSS JOIN (VALUES ('sales'), ('rd'), ('production'), ('hr')) AS d(department);

-- Backfill: les anciens effectifs plats (par palier, non affectés à un
-- département) sont rapatriés dans "production", le département générique
-- le plus proche de leur ancien sens, avant que ces colonnes ne soient
-- supprimées de Company ci-dessous.
INSERT INTO "CompanyEmployeeCount" ("companyId", "department", "tier", "count")
SELECT id, 'production', 'unskilled', "unskilledEmployeeCount" FROM "Company" WHERE "unskilledEmployeeCount" > 0
UNION ALL
SELECT id, 'production', 'qualified', "qualifiedEmployeeCount" FROM "Company" WHERE "qualifiedEmployeeCount" > 0
UNION ALL
SELECT id, 'production', 'specialist', "specialistEmployeeCount" FROM "Company" WHERE "specialistEmployeeCount" > 0;

-- AlterTable
ALTER TABLE "Company" DROP COLUMN "unskilledEmployeeCount",
DROP COLUMN "qualifiedEmployeeCount",
DROP COLUMN "specialistEmployeeCount";
