-- Ancienneté cumulée par département (cf. domain/organization.ts) — une
-- équipe qui tourne depuis longtemps devient plus productive.
ALTER TABLE "CompanyDepartment" ADD COLUMN "experienceCycles" INTEGER NOT NULL DEFAULT 0;
