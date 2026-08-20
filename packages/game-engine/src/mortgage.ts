import { BASE_MORTGAGE_RATE, MAX_MORTGAGE_LTV_RATIO, MORTGAGE_RISK_PREMIUM_MAX } from "@patrimoine-jeu/domain";

/**
 * Prêts hypothécaires — cf. domain/mortgage.ts pour les constantes de
 * calibrage. L'échéance par cycle réutilise directement
 * computeLoanCyclePayment (packages/game-engine/src/finance.ts) : même
 * amortissement linéaire + intérêts sur solde restant que les prêts
 * d'entreprise, pas de formule dupliquée.
 */

/**
 * Taux annuel fixé à l'origine selon le ratio prêt/valeur (LTV) : moins
 * d'apport (LTV élevé) = prime de risque plus élevée, plafonnée au taux
 * max exactement au LTV maximal autorisé (MAX_MORTGAGE_LTV_RATIO).
 */
export function computeMortgageRate(ltv: number): number {
  const riskPremium = MORTGAGE_RISK_PREMIUM_MAX * Math.min(1, ltv / MAX_MORTGAGE_LTV_RATIO);
  return BASE_MORTGAGE_RATE + riskPremium;
}
