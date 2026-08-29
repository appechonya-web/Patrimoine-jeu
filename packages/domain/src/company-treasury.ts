import { z } from "zod";

/**
 * Placement de trésorerie d'entreprise — jusqu'ici Company.cashReserve
 * inutilisée dormait sans jamais rapporter, contrairement au patrimoine
 * liquide d'un joueur qui peut aller en épargne/placements. Un bucket
 * séparé (Company.treasuryInvestment), alimenté/retiré librement par le
 * joueur qui contrôle l'entreprise, qui rapporte un revenu passif modeste
 * chaque cycle — taxé et distribué comme n'importe quel autre revenu
 * d'entreprise (cf. game-engine/companies.ts computeCompanyResult), pas un
 * régime fiscal à part.
 */
export const MIN_TREASURY_MOVEMENT = 50;
export const COMPANY_TREASURY_YIELD_ANNUAL_RATE = 0.02;

export const investCompanyTreasuryInputSchema = z.object({
  amount: z.number().min(MIN_TREASURY_MOVEMENT),
});
export type InvestCompanyTreasuryInput = z.infer<typeof investCompanyTreasuryInputSchema>;

export const withdrawCompanyTreasuryInputSchema = z.object({
  amount: z.number().min(MIN_TREASURY_MOVEMENT),
});
export type WithdrawCompanyTreasuryInput = z.infer<typeof withdrawCompanyTreasuryInputSchema>;
