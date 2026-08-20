export interface IsocRuleSet {
  isocRate: number;
  isocReducedRate: number;
  isocReducedThreshold: number;
}

/**
 * Impôt des sociétés (ISOC) — v1 simplifiée : taux réduit PME sous le seuil,
 * taux plein au-delà (section 7 du document de conception). Ne modélise pas
 * les conditions d'éligibilité réelles au taux réduit (répartition du
 * capital, rémunération minimale du dirigeant, etc.) — à affiner plus tard.
 */
export function calculateIsoc(annualProfit: number, ruleSet: IsocRuleSet): number {
  const taxableProfit = Math.max(0, annualProfit);

  if (taxableProfit <= ruleSet.isocReducedThreshold) {
    return taxableProfit * ruleSet.isocReducedRate;
  }

  const reducedPortion = ruleSet.isocReducedThreshold * ruleSet.isocReducedRate;
  const fullPortion = (taxableProfit - ruleSet.isocReducedThreshold) * ruleSet.isocRate;
  return reducedPortion + fullPortion;
}
