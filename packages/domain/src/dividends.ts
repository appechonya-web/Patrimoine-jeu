import { z } from "zod";

/**
 * Distribution des bénéfices — le levier fiscal le plus connu d'un dirigeant
 * de PME belge : sortir l'argent de sa société en payant le moins d'impôt
 * possible, légalement. Deux régimes, une politique par entreprise
 * (Company.distributionPolicy) choisie par l'actionnaire principal :
 *
 * - "dividend" (par défaut, comportement historique du jeu) : le bénéfice
 *   net (après ISOC) est distribué aux actionnaires à chaque cycle, taxé au
 *   précompte mobilier standard de 30% — jusqu'ici cette distribution
 *   automatique n'était taxée à aucun niveau personnel, un vrai trou de
 *   réalisme comblé ici.
 * - "reserve" : le bénéfice n'est pas distribué ; il rejoint une réserve de
 *   liquidation (Company.liquidationReserve), taxée à 10% à la constitution
 *   (bien moins que 30%) mais gelée — la retirer avant son délai coûte une
 *   taxe additionnelle de 20% (encore un peu moins cher qu'un dividende
 *   immédiat : 10%+20% de ce qui reste ≈ 28% effectif), la retirer après ne
 *   coûte plus rien de plus (10% effectif au total). Récompense la
 *   patience, comme le reste du jeu.
 *
 * Simplification volontaire par rapport au vrai régime belge (conditions
 * d'éligibilité PME, tranches historiques par exercice, VVPRbis...) — les
 * deux taux clés (30% standard, 10%/20% pour la réserve) sont corrects, le
 * mécanisme réel est plus fin. Le vrai régime impose 5 ans ; ici volontairement
 * ramené à ~1 an réel (cf. audit d'équilibrage) pour rester jouable — la
 * réalisme fiscal cède le pas à la jouabilité sur ce seul paramètre.
 */

export const DIVIDEND_WITHHOLDING_RATE = 0.3;

export const LIQUIDATION_RESERVE_ENTRY_TAX_RATE = 0.1;
export const LIQUIDATION_RESERVE_EARLY_WITHDRAWAL_TAX_RATE = 0.2;
/** ~1 an réel (365×24 cycles, à raison d'1 cycle/heure) — la "période d'attente" avant qu'une réserve de liquidation puisse sortir sans taxe additionnelle. */
export const LIQUIDATION_RESERVE_HOLDING_CYCLES = 365 * 24;

export const DISTRIBUTION_POLICIES = ["dividend", "reserve"] as const;
export type DistributionPolicy = (typeof DISTRIBUTION_POLICIES)[number];

export const setDistributionPolicyInputSchema = z.object({
  policy: z.enum(DISTRIBUTION_POLICIES),
});
export type SetDistributionPolicyInput = z.infer<typeof setDistributionPolicyInputSchema>;

export const withdrawLiquidationReserveInputSchema = z.object({
  amount: z.number().positive(),
});
export type WithdrawLiquidationReserveInput = z.infer<typeof withdrawLiquidationReserveInputSchema>;
