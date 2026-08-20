import { MIN_PERSONAL_GOOD_RESIDUAL_RATIO } from "@patrimoine-jeu/domain";

/**
 * Biens de consommation personnels — cf. domain/personal-goods.ts.
 * Dépréciation exponentielle, plancher à MIN_PERSONAL_GOOD_RESIDUAL_RATIO
 * (un bien usagé garde toujours un peu de valeur).
 */
export function computePersonalGoodValue(
  purchasePrice: number,
  depreciationRatePerCycle: number,
  cyclesOwned: number,
): number {
  const residualRatio = Math.max(
    MIN_PERSONAL_GOOD_RESIDUAL_RATIO,
    Math.pow(1 - depreciationRatePerCycle, Math.max(0, cyclesOwned)),
  );
  return purchasePrice * residualRatio;
}
