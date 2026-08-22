import { z } from "zod";

/**
 * Statut d'indépendant complémentaire — activité annexe déclarée en plus
 * d'un emploi salarié principal (obligatoire : suppose une activité
 * principale existante, comme en Belgique réelle). Contrairement à un
 * indépendant à titre principal, aucun forfait minimum trimestriel
 * (TaxRuleSet.selfEmployedMinimumQuarterly) ne s'applique : les cotisations
 * sociales sont strictement proportionnelles au revenu déclaré (cf.
 * fiscal-be calculateSelfEmployedContributions). Le revenu net s'agrège au
 * salaire principal pour l'IPP, taxé au même barème progressif — un revenu
 * annexe pousse donc potentiellement vers une tranche marginale plus
 * élevée, contrairement à l'idée reçue d'un "à-côté peu taxé".
 */

export const MIN_INDEPENDENT_ACTIVITY_REVENUE_PER_CYCLE = 1;
/**
 * Plafond volontaire — sans lui, ce champ déclaratif libre revient à de
 * l'argent illimité (aucun coût, aucun effort, aucun risque associés à ce
 * chiffre, contrairement à un emploi ou une entreprise). Calibré à un peu
 * plus du double du meilleur salaire brut/cycle du jeu (cadre commercial,
 * 68 000 €/an ≈ 186 €/cycle, cf. NPC_JOBS) : un vrai à-côté florissant reste
 * possible, mais jamais une fontaine à argent.
 */
export const MAX_INDEPENDENT_ACTIVITY_REVENUE_PER_CYCLE = 400;

export const startIndependentActivityInputSchema = z.object({
  grossRevenuePerCycle: z
    .number()
    .min(MIN_INDEPENDENT_ACTIVITY_REVENUE_PER_CYCLE)
    .max(MAX_INDEPENDENT_ACTIVITY_REVENUE_PER_CYCLE),
});
export type StartIndependentActivityInput = z.infer<typeof startIndependentActivityInputSchema>;
