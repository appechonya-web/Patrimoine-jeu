import {
  DIVIDEND_WITHHOLDING_RATE,
  LIQUIDATION_RESERVE_EARLY_WITHDRAWAL_TAX_RATE,
  LIQUIDATION_RESERVE_ENTRY_TAX_RATE,
  LIQUIDATION_RESERVE_HOLDING_CYCLES,
} from "@patrimoine-jeu/domain";

/**
 * Distribution des bénéfices — cf. domain/dividends.ts pour le calibrage et
 * la logique fiscale réelle simplifiée.
 */

export interface DividendResult {
  tax: number;
  net: number;
}

/** Dividende distribué à un actionnaire — le précompte mobilier ne s'applique qu'à une part de profit positive. */
export function computeDividendDistribution(grossShare: number): DividendResult {
  if (grossShare <= 0) return { tax: 0, net: grossShare };
  const tax = grossShare * DIVIDEND_WITHHOLDING_RATE;
  return { tax, net: grossShare - tax };
}

/** Constitution de la réserve de liquidation à partir du profit net du cycle — 10% part immédiatement à l'État. */
export function computeLiquidationReserveEntry(profit: number): DividendResult {
  if (profit <= 0) return { tax: 0, net: 0 };
  const tax = profit * LIQUIDATION_RESERVE_ENTRY_TAX_RATE;
  return { tax, net: profit - tax };
}

export function isLiquidationReserveMature(sinceCycle: number, currentCycle: number): boolean {
  return currentCycle - sinceCycle >= LIQUIDATION_RESERVE_HOLDING_CYCLES;
}

/** Retrait de la réserve — gratuit après maturité (LIQUIDATION_RESERVE_HOLDING_CYCLES), sinon une taxe additionnelle s'applique (mais reste moins chère qu'un dividende immédiat). */
export function computeLiquidationReserveWithdrawal(amount: number, isMature: boolean): DividendResult {
  if (isMature) return { tax: 0, net: amount };
  const tax = amount * LIQUIDATION_RESERVE_EARLY_WITHDRAWAL_TAX_RATE;
  return { tax, net: amount - tax };
}
