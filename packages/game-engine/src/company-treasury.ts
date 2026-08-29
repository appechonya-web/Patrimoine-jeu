import { COMPANY_TREASURY_YIELD_ANNUAL_RATE, CYCLES_PER_YEAR } from "@patrimoine-jeu/domain";

/** Revenu passif du placement de trésorerie ce cycle — taxé/distribué comme n'importe quel autre revenu d'entreprise, cf. companies.ts computeCompanyResult. */
export function computeCompanyTreasuryYieldPerCycle(treasuryInvestment: number): number {
  return (Math.max(0, treasuryInvestment) * COMPANY_TREASURY_YIELD_ANNUAL_RATE) / CYCLES_PER_YEAR;
}
