-- Population par province (cf. domain/market.ts, game-engine/municipality.ts)
-- — remplace le seul nombre de joueurs inscrits comme moteur principal de
-- la taille des marchés. Seedée sur les proportions démographiques réelles
-- des 11 provinces belges (total 100 000 unités de population de jeu).
ALTER TABLE "Municipality" ADD COLUMN "population" INTEGER NOT NULL DEFAULT 0;

UPDATE "Municipality" SET "population" = 16300 WHERE "name" = 'Anvers';
UPDATE "Municipality" SET "population" = 10000 WHERE "name" = 'Brabant flamand';
UPDATE "Municipality" SET "population" = 10400 WHERE "name" = 'Flandre-Occidentale';
UPDATE "Municipality" SET "population" = 13300 WHERE "name" = 'Flandre-Orientale';
UPDATE "Municipality" SET "population" = 7600 WHERE "name" = 'Limbourg';
UPDATE "Municipality" SET "population" = 3600 WHERE "name" = 'Brabant wallon';
UPDATE "Municipality" SET "population" = 11700 WHERE "name" = 'Hainaut';
UPDATE "Municipality" SET "population" = 9700 WHERE "name" = 'Liège';
UPDATE "Municipality" SET "population" = 2500 WHERE "name" = 'Luxembourg';
UPDATE "Municipality" SET "population" = 4300 WHERE "name" = 'Namur';
UPDATE "Municipality" SET "population" = 10600 WHERE "name" = 'Bruxelles-Capitale';
