import {
  MAX_PERSONAL_GLOBAL_TIER_BONUS,
  PERSONAL_GLOBAL_TIER_SCALE,
  PERSONAL_INVESTMENT_LEVEL_SCALE,
} from "@patrimoine-jeu/domain";

/**
 * Niveau d'un axe personnel (0-100) à partir de l'investissement cumulé —
 * même courbe en racine carrée que computeInvestmentLevel (entreprise, cf.
 * packages/game-engine/src/companies.ts), à l'échelle personnelle
 * (PERSONAL_INVESTMENT_LEVEL_SCALE).
 */
export function computePersonalInvestmentLevel(cumulativeInvestment: number): number {
  return Math.min(100, Math.sqrt(Math.max(0, cumulativeInvestment) / PERSONAL_INVESTMENT_LEVEL_SCALE));
}

/**
 * Palier mondial personnel (cf. computeGlobalTierBonus côté entreprise,
 * packages/game-engine/src/companies.ts) : au-delà du seuil du niveau 100,
 * chaque euro supplémentaire continue de rapporter un bonus, en rendements
 * décroissants — appliqué EN PLUS du niveau de base par
 * computeEffectivePersonalInvestmentLevel, jamais à sa place.
 */
export function computePersonalGlobalTierBonus(cumulativeInvestment: number): number {
  const baseThreshold = PERSONAL_INVESTMENT_LEVEL_SCALE * 100 * 100;
  const excess = Math.max(0, cumulativeInvestment - baseThreshold);
  return Math.min(MAX_PERSONAL_GLOBAL_TIER_BONUS, Math.sqrt(excess / PERSONAL_GLOBAL_TIER_SCALE));
}

/**
 * Niveau EFFECTIF d'un axe personnel — base (0-100, computePersonalInvestmentLevel)
 * + palier mondial (au-delà de 100, computePersonalGlobalTierBonus) — à
 * utiliser PARTOUT où un niveau d'axe personnel alimente une formule de jeu
 * (cycles.ts, l'estimation affichée dans employment.service.ts, et
 * l'affichage dans personal.service.ts), pour que le palier mondial reste
 * cohérent entre la simulation et ce que le joueur voit.
 */
export function computeEffectivePersonalInvestmentLevel(cumulativeInvestment: number): number {
  return computePersonalInvestmentLevel(cumulativeInvestment) + computePersonalGlobalTierBonus(cumulativeInvestment);
}
