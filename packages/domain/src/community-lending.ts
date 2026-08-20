import { z } from "zod";

/**
 * Prêts entre joueurs — une entreprise (via son actionnaire principal) peut
 * proposer un prêt sur un marché ouvert, financé par sa propre trésorerie
 * (cashReserve) ; n'importe quel autre joueur peut le prendre. Contrairement
 * aux hypothèques (toujours SYSTEM, taux imposé par la LTV), ici c'est le
 * prêteur qui fixe librement son taux et sa durée dans des bornes
 * raisonnables — de la vraie concurrence entre "banques" joueurs. Réutilise
 * le modèle Loan existant (LenderType.COMPANY, jusqu'ici jamais utilisé) et
 * le même amortissement que les prêts d'entreprise/hypothécaires (cf.
 * packages/game-engine/src/finance.ts, computeLoanCyclePayment).
 */

export const MIN_LOAN_OFFER_PRINCIPAL = 100;
export const MIN_COMMUNITY_LOAN_RATE = 0.02;
export const MAX_COMMUNITY_LOAN_RATE = 0.15;
export const MIN_COMMUNITY_LOAN_TERM_CYCLES = 90;
export const MAX_COMMUNITY_LOAN_TERM_CYCLES = 1460;

/**
 * Un défaut sur un prêt communautaire fait perdre de l'argent à un autre
 * joueur (pas juste "la banque") — la sanction en réputation est donc plus
 * sévère qu'un défaut hypothécaire (cf. domain/mortgage.ts, 15).
 */
export const COMMUNITY_LOAN_DEFAULT_REPUTATION_PENALTY = 20;

export const createLoanOfferInputSchema = z.object({
  principal: z.number().min(MIN_LOAN_OFFER_PRINCIPAL),
  rate: z.number().min(MIN_COMMUNITY_LOAN_RATE).max(MAX_COMMUNITY_LOAN_RATE),
  termCycles: z.number().int().min(MIN_COMMUNITY_LOAN_TERM_CYCLES).max(MAX_COMMUNITY_LOAN_TERM_CYCLES),
});
export type CreateLoanOfferInput = z.infer<typeof createLoanOfferInputSchema>;
