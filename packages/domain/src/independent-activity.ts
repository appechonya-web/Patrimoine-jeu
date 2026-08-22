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
 * l'argent illimité. Le vrai garde-fou contre l'abus est le coût en
 * bien-être ci-dessous (qui grimpe au carré du revenu déclaré) ; ce plafond
 * n'est qu'un filet de sécurité technique au-dessus duquel ce coût ne suffit
 * plus à dissuader.
 */
export const MAX_INDEPENDENT_ACTIVITY_REVENUE_PER_CYCLE = 250;

/**
 * Coût en bien-être par cycle, croissant avec le carré du revenu déclaré
 * (cf. game-engine/wellbeing.ts, computeIndependentActivityWellbeingDrain) —
 * contrairement à un emploi (pression fixe, cf. NPC_JOBS), cette activité
 * n'a par nature aucun coût structurel : sans ce mécanisme, rien n'empêche
 * de la pousser au maximum sans contrepartie. La courbe quadratique reste
 * quasi gratuite pour un petit à-côté modeste, mais devient plus coûteuse
 * que N'IMPORTE quel emploi du jeu (cf. NPC_JOBS, pression max 85 ≈ 1.82/cycle
 * pour un vétéran non expérimenté) une fois proche du plafond — l'exact
 * inverse d'un emploi, où plus tu restes, moins ça coûte.
 */
export const INDEPENDENT_ACTIVITY_MAX_WELLBEING_DRAIN_PER_CYCLE = 2.5;

export const startIndependentActivityInputSchema = z.object({
  grossRevenuePerCycle: z
    .number()
    .min(MIN_INDEPENDENT_ACTIVITY_REVENUE_PER_CYCLE)
    .max(MAX_INDEPENDENT_ACTIVITY_REVENUE_PER_CYCLE),
});
export type StartIndependentActivityInput = z.infer<typeof startIndependentActivityInputSchema>;
