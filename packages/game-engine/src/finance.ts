import {
  BASE_LOAN_RATE,
  CYCLES_PER_YEAR,
  EQUIPMENT_DEPRECIATION_RATE_PER_CYCLE,
  EQUITY_FLOOR,
  LOAN_RISK_PREMIUM_MAX,
  REFERENCE_DEBT_EQUITY_RATIO,
} from "@patrimoine-jeu/domain";

/**
 * Finance & bilan d'entreprise — prêts à taux fixé selon le risque au
 * moment de l'emprunt, amortissement de l'équipement, bilan simplifié
 * (cf. domain/finance.ts pour le détail des constantes de calibrage).
 */

/** Ratio dette/fonds propres — fonds propres plancherisés pour éviter une division par une valeur nulle/négative. */
export function computeDebtToEquityRatio(totalDebt: number, equity: number): number {
  return totalDebt / Math.max(EQUITY_FLOOR, equity);
}

/**
 * Taux annuel fixé à l'origine d'un prêt, en fonction du ratio
 * dette/fonds propres PROJETÉ (dette existante + nouveau principal) : plus
 * l'entreprise s'endette, plus le taux de CE prêt est élevé — auto-limitant,
 * pas besoin de plafond arbitraire séparé sur le taux lui-même.
 */
export function computeLoanRate(currentDebt: number, principal: number, equity: number): number {
  const projectedDebtToEquity = computeDebtToEquityRatio(currentDebt + principal, equity);
  const riskPremium = LOAN_RISK_PREMIUM_MAX * Math.min(1, projectedDebtToEquity / REFERENCE_DEBT_EQUITY_RATIO);
  return BASE_LOAN_RATE + riskPremium;
}

export interface LoanCyclePayment {
  interest: number;
  principalPortion: number;
  totalPayment: number;
}

/**
 * Échéance d'un cycle : amortissement linéaire du principal sur la durée du
 * prêt + intérêts sur le solde restant (taux annuel ramené au cycle). La
 * part de principal est plafonnée au solde restant pour ne jamais rembourser
 * plus que ce qui est dû (dernière échéance).
 */
export function computeLoanCyclePayment(loan: {
  principal: number;
  termCycles: number;
  remainingBalance: number;
  rate: number;
}): LoanCyclePayment {
  const interest = loan.remainingBalance * (loan.rate / CYCLES_PER_YEAR);
  const principalPortion = Math.min(loan.principal / loan.termCycles, loan.remainingBalance);
  return { interest, principalPortion, totalPayment: interest + principalPortion };
}

/** Valeur comptable de l'équipement = coût cumulé - amortissement déjà comptabilisé. */
export function computeEquipmentBookValue(equipmentInvestment: number, accumulatedDepreciation: number): number {
  return Math.max(0, equipmentInvestment - accumulatedDepreciation);
}

/** Amortissement du cycle — dégressif (fraction constante de la valeur comptable restante, pas de durée de vie à suivre). */
export function computeEquipmentDepreciation(bookValue: number): number {
  return bookValue * EQUIPMENT_DEPRECIATION_RATE_PER_CYCLE;
}

export interface CompanyBalanceSheetInputs {
  cashReserve: number;
  equipmentBookValue: number;
  otherInvestmentsCumulative: number;
  inventoryValue: number;
  totalDebt: number;
  /** Solde restant dû sur les prêts communautaires accordés par l'entreprise (cf. domain/community-lending.ts) — une créance, donc un actif. */
  loansReceivable: number;
  /** Réserve de liquidation (cf. domain/dividends.ts) — du cash déjà taxé à 10% mais toujours un actif de l'entreprise tant qu'il n'est pas distribué. */
  liquidationReserve: number;
  /**
   * Valeur comptable des participations détenues dans d'autres entreprises
   * (cf. CompanyShare.holderCompany, groupe/holding) — quote-part de
   * l'équité AUTONOME de chaque filiale (pas sa propre valeur consolidée :
   * une holding-de-holding ne remonte qu'un niveau, cf. cycles.ts). Un vrai
   * actif : c'est ce qui reviendrait à cette entreprise si elle revendait
   * ses parts.
   */
  equityStakesHeldValue: number;
}

export interface CompanyBalanceSheet {
  totalAssets: number;
  totalLiabilities: number;
  equity: number;
  debtToEquityRatio: number;
}

/**
 * Bilan simplifié : les capitaux propres sont le SOLDE (actif - passif),
 * pas une valeur suivie indépendamment — garantit que le bilan s'équilibre
 * toujours par construction, comme en comptabilité réelle.
 */
export function computeCompanyBalanceSheet(inputs: CompanyBalanceSheetInputs): CompanyBalanceSheet {
  const {
    cashReserve,
    equipmentBookValue,
    otherInvestmentsCumulative,
    inventoryValue,
    totalDebt,
    loansReceivable,
    liquidationReserve,
    equityStakesHeldValue,
  } = inputs;
  const totalAssets =
    cashReserve +
    equipmentBookValue +
    otherInvestmentsCumulative +
    inventoryValue +
    loansReceivable +
    liquidationReserve +
    equityStakesHeldValue;
  const equity = totalAssets - totalDebt;
  return {
    totalAssets,
    totalLiabilities: totalDebt,
    equity,
    debtToEquityRatio: computeDebtToEquityRatio(totalDebt, equity),
  };
}
