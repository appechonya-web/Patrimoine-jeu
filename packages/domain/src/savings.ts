import { z } from "zod";

/**
 * Épargne & produits financiers — trois façons de placer son cash en
 * dehors de la bourse/l'immobilier/l'entreprise, avec un vrai arbitrage
 * liquidité/rendement, comme dans la réalité belge. L'intérêt composé par
 * cycle est taxé au taux "plus-values" (cf. TaxRuleSet.capitalGainsRate,
 * jusqu'ici défini au seed mais jamais utilisé), avec une franchise à vie
 * (capitalGainsExemption) — simplification volontaire par rapport au vrai
 * régime annuel belge, pour ne pas avoir à suivre une remise à zéro
 * calendaire. L'épargne-pension fait exception : intérêts exonérés ET
 * réduction d'impôt immédiate sur versement (cf. TaxRuleSet.pensionSavings*,
 * game-engine/savings.ts computePensionSavingsTaxReduction), plafonnée par
 * cycle-année — le vrai avantage fiscal du produit, en échange d'un blocage
 * bien plus long et d'une pénalité de sortie anticipée plus sévère.
 */

export const SAVINGS_PRODUCT_TYPES = ["livret", "compte-terme", "pension"] as const;
export type SavingsProductType = (typeof SAVINGS_PRODUCT_TYPES)[number];

export const SAVINGS_PRODUCT_LABELS: Record<SavingsProductType, string> = {
  livret: "Livret d'épargne",
  "compte-terme": "Compte à terme",
  pension: "Épargne-pension",
};

export const SAVINGS_PRODUCT_DESCRIPTIONS: Record<SavingsProductType, string> = {
  livret: "Retrait libre à tout moment, taux modeste — pour du cash qui dort sans être immobilisé.",
  "compte-terme": "Bloqué pour une durée choisie, taux plus élevé — un retrait anticipé sacrifie tous les intérêts courus.",
  pension: "Le taux le plus élevé, intérêts exonérés d'impôt — mais bloqué ~1 an, avec une vraie pénalité en cas de sortie anticipée.",
};

export const LIVRET_ANNUAL_RATE = 0.015;

export const COMPTE_TERME_TERM_OPTIONS_CYCLES = [365, 730, 1460] as const;
export type CompteTermeCycles = (typeof COMPTE_TERME_TERM_OPTIONS_CYCLES)[number];
export const COMPTE_TERME_RATE_BY_TERM: Record<CompteTermeCycles, number> = {
  365: 0.03,
  730: 0.035,
  1460: 0.045,
};

/** ~1 an réel (365×24 cycles, à raison d'1 cycle/heure) — le vrai régime belge bloque 5 ans ; ramené ici pour rester jouable (cf. audit d'équilibrage). */
export const PENSION_TERM_CYCLES = 365 * 24;
export const PENSION_ANNUAL_RATE = 0.055;
/** Pénalité en capital pour un retrait avant le terme, en plus de la perte des intérêts courus. */
export const PENSION_EARLY_WITHDRAWAL_PRINCIPAL_PENALTY_RATIO = 0.1;

export const MIN_SAVINGS_DEPOSIT = 20;

export const openSavingsAccountInputSchema = z.object({
  productType: z.enum(SAVINGS_PRODUCT_TYPES),
  amount: z.number().min(MIN_SAVINGS_DEPOSIT),
  termCycles: z.union([z.literal(365), z.literal(730), z.literal(1460)]).optional(),
});
export type OpenSavingsAccountInput = z.infer<typeof openSavingsAccountInputSchema>;

/**
 * `amount` omis = retrait total (seule option pour compte-terme/pension,
 * dont le solde n'est jamais retiré partiellement). Un livret accepte un
 * montant partiel.
 */
export const withdrawSavingsInputSchema = z.object({
  amount: z.number().min(0.01).optional(),
});
export type WithdrawSavingsInput = z.infer<typeof withdrawSavingsInputSchema>;

/**
 * Réservé au livret (cf. SavingsService.deposit) : contrairement au compte à
 * terme et à la pension, un vrai livret d'épargne reste alimentable à tout
 * moment après ouverture, pas de montant figé une fois pour toutes.
 */
export const depositSavingsInputSchema = z.object({
  amount: z.number().min(MIN_SAVINGS_DEPOSIT),
});
export type DepositSavingsInput = z.infer<typeof depositSavingsInputSchema>;
