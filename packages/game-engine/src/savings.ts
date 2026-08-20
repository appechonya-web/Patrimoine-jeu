import {
  COMPTE_TERME_RATE_BY_TERM,
  CYCLES_PER_YEAR,
  LIVRET_ANNUAL_RATE,
  PENSION_ANNUAL_RATE,
  PENSION_EARLY_WITHDRAWAL_PRINCIPAL_PENALTY_RATIO,
  type CompteTermeCycles,
  type SavingsProductType,
} from "@patrimoine-jeu/domain";

/**
 * Épargne & produits financiers — cf. domain/savings.ts pour le calibrage.
 * Intérêt composé par cycle, taxé au taux plus-values au-delà de la
 * franchise à vie restante du joueur (sauf pension, exonérée).
 */

export function resolveSavingsRate(productType: SavingsProductType, termCycles: number): number {
  if (productType === "livret") return LIVRET_ANNUAL_RATE;
  if (productType === "pension") return PENSION_ANNUAL_RATE;
  return COMPTE_TERME_RATE_BY_TERM[termCycles as CompteTermeCycles] ?? COMPTE_TERME_RATE_BY_TERM[365];
}

export interface SavingsInterestResult {
  grossInterest: number;
  tax: number;
  netInterest: number;
}

export function computeSavingsInterest(
  balance: number,
  annualRate: number,
  isTaxExempt: boolean,
  exemptionRemaining: number,
  capitalGainsRate: number,
): SavingsInterestResult {
  const grossInterest = balance * (annualRate / CYCLES_PER_YEAR);
  if (isTaxExempt) {
    return { grossInterest, tax: 0, netInterest: grossInterest };
  }
  const taxableAmount = Math.max(0, grossInterest - Math.max(0, exemptionRemaining));
  const tax = taxableAmount * capitalGainsRate;
  return { grossInterest, tax, netInterest: grossInterest - tax };
}

/**
 * Montant récupéré en cas de retrait AVANT le terme : les intérêts courus
 * sont toujours sacrifiés (on ne retire que le principal), et l'épargne-
 * pension inflige en plus une pénalité en capital — la sanction bien réelle
 * d'une sortie anticipée sur ce produit.
 */
export function computeEarlyWithdrawalAmount(productType: SavingsProductType, principal: number): number {
  if (productType === "pension") {
    return principal * (1 - PENSION_EARLY_WITHDRAWAL_PRINCIPAL_PENALTY_RATIO);
  }
  return principal;
}

export interface PensionSavingsTaxReductionResult {
  eligibleAmount: number;
  taxReduction: number;
}

/**
 * Réduction d'impôt immédiate sur un versement épargne-pension — le vrai
 * levier légal du produit (cf. TaxRuleSet.pensionSavingsTaxReductionRate),
 * plafonnée par cycle-année (365 cycles, cf. CYCLES_PER_YEAR) puisque le jeu
 * n'a pas de notion d'année calendaire. Seule la part sous le plafond restant
 * ouvre droit à la réduction ; le surplus est versé normalement mais sans
 * avantage fiscal.
 */
export function computePensionSavingsTaxReduction(
  contributionAmount: number,
  alreadyContributedThisYear: number,
  annualCap: number,
  taxReductionRate: number,
): PensionSavingsTaxReductionResult {
  const remainingCap = Math.max(0, annualCap - alreadyContributedThisYear);
  const eligibleAmount = Math.min(contributionAmount, remainingCap);
  return { eligibleAmount, taxReduction: eligibleAmount * taxReductionRate };
}
