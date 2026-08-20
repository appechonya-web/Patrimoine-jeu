import { z } from "zod";

/**
 * Prêts hypothécaires — réutilise le modèle Loan déjà présent dans le
 * schéma (scaffold jamais branché, distinct de CompanyLoan qui concerne les
 * entreprises), toujours prêteur SYSTEM pour cette première passe (pas de
 * prêt entre joueurs). Le bien financé sert de garantie
 * (collateralPropertyId) : un défaut de paiement entraîne sa saisie.
 * Rembours par cycle : mêmes mécaniques d'amortissement que CompanyLoan
 * (cf. packages/game-engine/src/finance.ts, computeLoanCyclePayment,
 * réutilisée telle quelle).
 */

/**
 * Impossible d'emprunter plus que cette fraction de la valeur du bien —
 * comme un vrai apport minimal exigé par la banque. Sert aussi de référence
 * pour le taux : plus l'emprunt s'approche de ce plafond, plus la prime de
 * risque est élevée (moins d'apport = plus de risque pour la banque).
 */
export const MAX_MORTGAGE_LTV_RATIO = 0.8;

/** Taux hypothécaire plus bas qu'un prêt d'entreprise — le bien immobilier en garantie réduit le risque perçu. */
export const BASE_MORTGAGE_RATE = 0.035;
export const MORTGAGE_RISK_PREMIUM_MAX = 0.03;

export const MORTGAGE_TERM_OPTIONS_CYCLES = [365, 730, 1460] as const;
export type MortgageTermCycles = (typeof MORTGAGE_TERM_OPTIONS_CYCLES)[number];

export const MIN_MORTGAGE_PRINCIPAL = 100;

/**
 * Défaut de paiement : le bien est saisi (remis sur le marché, décoté —
 * une vente forcée se négocie toujours en dessous de la valeur réelle) et
 * le solde est effacé (la banque encaisse la perte) ; l'emprunteur paie en
 * réputation, un vrai événement de crédit.
 */
export const FORECLOSURE_SALE_RATIO = 0.9;
export const FORECLOSURE_REPUTATION_PENALTY = 15;

export const requestMortgageInputSchema = z.object({
  principal: z.number().min(MIN_MORTGAGE_PRINCIPAL),
  termCycles: z.union([z.literal(365), z.literal(730), z.literal(1460)]),
});
export type RequestMortgageInput = z.infer<typeof requestMortgageInputSchema>;
