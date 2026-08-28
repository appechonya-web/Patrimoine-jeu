import { z } from "zod";

/**
 * Domicile fiscal (cf. section 11 du document de conception, "vie
 * communale") — jusqu'ici les joueurs n'avaient aucune commune de
 * résidence, ce qui rendait Municipality.additionalTaxRate totalement
 * inerte (cf. municipality-governance.ts). Un déménagement coûte une somme
 * fixe et impose un cooldown — sans ça, un joueur pourrait arbitrer le taux
 * communal le plus bas à chaque cycle, ce qui viderait le choix de tout son
 * sens stratégique.
 */
export const MOVE_RESIDENCE_COST = 300;
export const MOVE_RESIDENCE_COOLDOWN_CYCLES = 30;

export const moveResidenceInputSchema = z.object({
  municipalityId: z.string().uuid(),
});
export type MoveResidenceInput = z.infer<typeof moveResidenceInputSchema>;

/**
 * Précompte immobilier — jusqu'ici aucune taxe foncière récurrente
 * n'existait dans le moteur (seuls les droits d'enregistrement, prélevés
 * une fois à l'achat, cf. property.ts). Un petit prélèvement par cycle sur
 * la valeur de chaque bien possédé, versé automatiquement au fonds
 * d'infrastructure de sa commune (Municipality.infrastructureFund) — une
 * boucle fiscale réaliste en plus des dons volontaires
 * (MunicipalityContribution).
 */
export const DEFAULT_ANNUAL_PROPERTY_TAX_RATE = 0.006;
