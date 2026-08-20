export interface TaxBracket {
  upTo: number | null;
  rate: number;
}

export interface IppRuleSet {
  effectiveFrom: string;
  taxFreeAllowance: number;
  brackets: TaxBracket[];
  socialContributionRate: number;
}

/**
 * Barème EI 2026 — valeurs à reconfirmer auprès du SPF Finances avant mise en
 * production (section 7 du document de conception : seuils encore incertains
 * à ce stade).
 */
export const IPP_2026: IppRuleSet = {
  effectiveFrom: "2026-01-01",
  taxFreeAllowance: 10_910,
  brackets: [
    { upTo: 15_200, rate: 0.25 },
    { upTo: 26_830, rate: 0.4 },
    { upTo: 46_440, rate: 0.45 },
    { upTo: null, rate: 0.5 },
  ],
  socialContributionRate: 0.1307,
};

export function applySocialContributions(grossIncome: number, ruleSet: IppRuleSet): number {
  return grossIncome * (1 - ruleSet.socialContributionRate);
}

export function calculateIpp(
  netTaxableIncome: number,
  ruleSet: IppRuleSet,
  communalSurchargeRate: number,
): { federalTax: number; communalTax: number; totalTax: number } {
  const taxable = Math.max(0, netTaxableIncome - ruleSet.taxFreeAllowance);

  let remaining = taxable;
  let previousThreshold = 0;
  let federalTax = 0;

  for (const bracket of ruleSet.brackets) {
    const bracketCeiling = bracket.upTo ?? Infinity;
    const bracketWidth = bracketCeiling - previousThreshold;
    const amountInBracket = Math.min(remaining, bracketWidth);

    if (amountInBracket <= 0) break;

    federalTax += amountInBracket * bracket.rate;
    remaining -= amountInBracket;
    previousThreshold = bracketCeiling;
  }

  const communalTax = federalTax * communalSurchargeRate;

  return { federalTax, communalTax, totalTax: federalTax + communalTax };
}

export function calculateNetAnnualIncome(
  grossAnnualIncome: number,
  ruleSet: IppRuleSet,
  communalSurchargeRate: number,
): { netTaxableIncome: number; totalTax: number; netAnnualIncome: number } {
  const netTaxableIncome = applySocialContributions(grossAnnualIncome, ruleSet);
  const { totalTax } = calculateIpp(netTaxableIncome, ruleSet, communalSurchargeRate);

  return { netTaxableIncome, totalTax, netAnnualIncome: netTaxableIncome - totalTax };
}
