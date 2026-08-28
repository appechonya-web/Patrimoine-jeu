-- Marchés internationaux — déblocage unique par entreprise (cf. domain/export.ts).
ALTER TABLE "Company" ADD COLUMN "exportUnlockedCycle" INTEGER;
