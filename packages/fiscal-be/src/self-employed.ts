import type { TaxBracket } from "./ipp.js";

/**
 * Cotisations sociales indépendant — barème progressif par tranches de
 * revenu net annuel (cf. TaxRuleSet.selfEmployedBrackets, seedées mais
 * jamais utilisées jusqu'ici). Contrairement à un indépendant à titre
 * principal, ce calcul ne connaît aucun forfait minimum trimestriel : c'est
 * au niveau appelant (statut "complémentaire" vs "principal") que ce
 * plancher doit être appliqué le cas échéant.
 */
export function calculateSelfEmployedContributions(annualGrossRevenue: number, brackets: TaxBracket[]): number {
  let remaining = annualGrossRevenue;
  let previousThreshold = 0;
  let contributions = 0;

  for (const bracket of brackets) {
    const bracketCeiling = bracket.upTo ?? Infinity;
    const bracketWidth = bracketCeiling - previousThreshold;
    const amountInBracket = Math.min(remaining, bracketWidth);

    if (amountInBracket <= 0) break;

    contributions += amountInBracket * bracket.rate;
    remaining -= amountInBracket;
    previousThreshold = bracketCeiling;
  }

  return contributions;
}
