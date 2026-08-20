import { CYCLES_PER_YEAR, SOLVENCY_RATIO_CAP } from "@patrimoine-jeu/domain";

export interface BankDepositInterestResult {
  grossInterest: number;
  tax: number;
  netInterest: number;
}

/**
 * Intérêt d'un dépôt bancaire — la banque (l'entreprise) paie l'intérêt
 * brut sur sa trésorerie, le déposant ne touche que le net (précompte
 * retenu à la source). Régime propre, pas de franchise partagée avec
 * l'épargne ou les actifs financiers — simplification volontaire.
 */
export function computeBankDepositInterest(balance: number, annualRate: number, taxRate: number): BankDepositInterestResult {
  const grossInterest = balance * (annualRate / CYCLES_PER_YEAR);
  const tax = grossInterest * taxRate;
  return { grossInterest, tax, netInterest: grossInterest - tax };
}

/**
 * Cote de fiabilité publique (cf. domain/banking.ts SOLVENCY_RATIO_CAP) —
 * 100 pour une banque sans aucun encours prêté (aucun risque), dégradée
 * linéairement à mesure que l'encours prêté approche le plafond de
 * solvabilité, 0 au-delà. N'exprime que la solvabilité, pas la liquidité
 * immédiate (déjà visible séparément via cashReserve).
 */
export function computeBankReliabilityRating(equity: number, outstandingLoans: number): number {
  if (equity <= 0) return 0;
  if (outstandingLoans <= 0) return 100;
  const maxLoans = equity * SOLVENCY_RATIO_CAP;
  const ratio = outstandingLoans / maxLoans;
  return Math.max(0, Math.min(100, (1 - ratio) * 100));
}
