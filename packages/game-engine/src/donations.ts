export interface CauseDonationTaxReductionResult {
  eligibleAmount: number;
  taxReduction: number;
}

/**
 * Réduction d'impôt immédiate sur un don à une cause reconnue — même
 * mécanique que la réduction d'épargne-pension (cf.
 * game-engine/savings.ts computePensionSavingsTaxReduction) : plafonnée
 * par cycle-année, seule la part sous le plafond restant ouvre droit à la
 * réduction.
 */
export function computeCauseDonationTaxReduction(
  donationAmount: number,
  alreadyDonatedThisYear: number,
  annualCap: number,
  taxReductionRate: number,
): CauseDonationTaxReductionResult {
  const remainingCap = Math.max(0, annualCap - alreadyDonatedThisYear);
  const eligibleAmount = Math.min(donationAmount, remainingCap);
  return { eligibleAmount, taxReduction: eligibleAmount * taxReductionRate };
}
