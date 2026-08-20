import { INFRASTRUCTURE_FUND_SCALE, MAX_INFRASTRUCTURE_ATTRACTIVENESS_BONUS } from "@patrimoine-jeu/domain";

/**
 * Infrastructures communales (cf. domain/municipality-governance.ts) — le
 * fonds cumulé relève l'attractivité effective de TOUTES les entreprises de
 * la commune, à rendement décroissant (même forme que
 * companies.ts computeInvestmentLevel : racine carrée, jamais totalement
 * plafonné mais négligeable au-delà d'un certain point).
 */
export function computeInfrastructureAttractivenessBonus(cumulativeFund: number): number {
  const level = Math.min(100, Math.sqrt(Math.max(0, cumulativeFund) / INFRASTRUCTURE_FUND_SCALE));
  return (level / 100) * MAX_INFRASTRUCTURE_ATTRACTIVENESS_BONUS;
}
