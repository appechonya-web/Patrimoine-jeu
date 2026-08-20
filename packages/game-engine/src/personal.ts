import { PERSONAL_INVESTMENT_LEVEL_SCALE } from "@patrimoine-jeu/domain";

/**
 * Niveau d'un axe personnel (0-100) à partir de l'investissement cumulé —
 * même courbe en racine carrée que computeInvestmentLevel (entreprise, cf.
 * packages/game-engine/src/companies.ts), à l'échelle personnelle
 * (PERSONAL_INVESTMENT_LEVEL_SCALE).
 */
export function computePersonalInvestmentLevel(cumulativeInvestment: number): number {
  return Math.min(100, Math.sqrt(Math.max(0, cumulativeInvestment) / PERSONAL_INVESTMENT_LEVEL_SCALE));
}
