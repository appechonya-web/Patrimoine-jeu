import { z } from "zod";

/**
 * Capital-risque entre joueurs (cf. section 11 du document de conception)
 * — financer l'entreprise d'un autre joueur EN ÉCHANGE DE NOUVELLES PARTS
 * ÉMISES, à la différence de tous les autres mécanismes d'actionnariat déjà
 * en place (marché secondaire, OPA hostile, rachat amical) qui ne font que
 * transférer des parts DÉJÀ existantes entre deux joueurs sans jamais
 * changer le total. Ici, l'argent va dans la trésorerie RÉELLE de
 * l'entreprise (pas dans la poche du fondateur) et de nouvelles parts sont
 * créées pour l'investisseur — ce qui dilue mécaniquement tous les
 * actionnaires existants au prorata (cf. game-engine/venture-capital.ts,
 * computeDilutedShares) pour que le total reste toujours 100%.
 */

export const MIN_CAPITAL_RAISE_AMOUNT = 100;
export const MIN_NEW_SHARE_PERCENTAGE = 0.01;
/** Plafond volontaire — une seule levée ne peut jamais diluer le fondateur à (quasi) rien d'un coup. */
export const MAX_NEW_SHARE_PERCENTAGE = 90;
export const CAPITAL_RAISE_DURATION_CYCLES = 14;

export const createCapitalRaiseInputSchema = z.object({
  targetAmount: z.number().min(MIN_CAPITAL_RAISE_AMOUNT),
  newSharePercentage: z.number().min(MIN_NEW_SHARE_PERCENTAGE).max(MAX_NEW_SHARE_PERCENTAGE),
});
export type CreateCapitalRaiseInput = z.infer<typeof createCapitalRaiseInputSchema>;

/**
 * Plus petite contribution acceptée sur un tour déjà ouvert — plus bas que
 * MIN_CAPITAL_RAISE_AMOUNT (qui borne le montant CIBLE du tour) pour
 * qu'un tour de 100€ reste finançable par plusieurs petits investisseurs
 * plutôt qu'un seul obligé de tout apporter.
 */
export const MIN_CAPITAL_RAISE_CONTRIBUTION = 20;

export const contributeToCapitalRaiseInputSchema = z.object({
  amount: z.number().min(MIN_CAPITAL_RAISE_CONTRIBUTION),
  /** Si la contribution vient de la trésorerie d'une entreprise contrôlée par le joueur (holding) plutôt que de son patrimoine personnel. */
  investorCompanyId: z.string().optional(),
});
export type ContributeToCapitalRaiseInput = z.infer<typeof contributeToCapitalRaiseInputSchema>;
