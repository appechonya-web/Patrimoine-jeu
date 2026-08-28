/**
 * Phase 2 de la croissance à grande échelle (cf. le holding/M&A de la phase
 * 1, packages/db/prisma/migrations/20260827180000_add_company_holding_shares)
 * — deux leviers purement additifs (aucune migration nécessaire) qui
 * repoussent le plafond de richesse au-delà de ce que permettent les
 * mécaniques de base, pour les meilleurs joueurs sur le très long terme.
 */

/**
 * Palier mondial : au-delà du niveau 100 (plafond dur de chaque levier
 * d'investissement, atteint à INVESTMENT_LEVEL_SCALE × 100² investis — cf.
 * company.ts), l'investissement cumulé continue de rapporter un bonus, en
 * rendements décroissants comme le reste du jeu — cf.
 * game-engine/companies.ts computeGlobalTierBonus. Un joueur qui a maxé un
 * levier n'est pas bloqué net : il entre dans un palier d'exportation/
 * rayonnement international, pas un mur.
 */
export const GLOBAL_TIER_SCALE = 50;
export const MAX_GLOBAL_TIER_BONUS = 100;

/**
 * Valorisation par rentabilité soutenue (cf. game-engine/companies.ts
 * computeValorizationMultiplier) — la richesse "millions, voire milliards"
 * promise aux meilleurs joueurs ne peut pas venir de la seule valeur
 * comptable (plafonnée par construction) : une entreprise dont la
 * rentabilité MOYENNE est soutenue sur toute sa vie (cumulativeNetProfit /
 * cyclesActive, insensible aux coups durs ponctuels contrairement à un
 * compteur de cycles consécutifs) vaut structurellement plus que sa seule
 * valeur comptable pour le patrimoine net et le classement — comme un vrai
 * multiple de résultat en bourse. N'affecte JAMAIS le bilan comptable
 * lui-même (capacité d'emprunt, prix plancher d'OPA) : uniquement ce qui
 * compte pour le patrimoine net affiché et le classement, pour ne pas ouvrir
 * de levier d'endettement artificiel.
 */
export const VALORIZATION_PROFIT_SCALE = 20;
export const MAX_VALORIZATION_MULTIPLIER = 50;
