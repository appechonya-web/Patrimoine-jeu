import { z } from "zod";

/**
 * Rachat hostile d'entreprise (section 12septies du document de
 * conception) — une offre publique d'achat (OPA) : n'importe quel joueur
 * peut proposer un prix par 1% de parts, ouvert à TOUS les actionnaires
 * actuels (pas seulement ceux qui ont choisi de vendre, contrairement au
 * marché secondaire classique, cf. domain/company.ts ListShareInput). Le
 * contrôle change de mains dès que l'acquéreur dépasse les autres
 * actionnaires en parts détenues — aucun champ "contrôle" séparé à tenir à
 * jour, la même règle du actionnaire-à-la-part-la-plus-élevée déjà en
 * place (cf. companies.service.ts getPrimaryOwnerId) s'applique
 * automatiquement.
 */

/** Prime minimale exigée sur la valeur comptable par part, pour que l'offre soit une vraie incitation et pas une tentative de rachat au rabais. */
export const MIN_TENDER_PREMIUM_RATIO = 1.1;
export const TENDER_OFFER_DURATION_CYCLES = 14;
export const MIN_TENDER_PERCENTAGE = 0.01;

export const launchTenderOfferInputSchema = z.object({
  pricePerPercent: z.number().positive(),
  /** Si l'OPA est lancée pour le compte d'une entreprise contrôlée par le joueur (holding) — payée par SA trésorerie plutôt que le patrimoine personnel du joueur. */
  acquirerCompanyId: z.string().optional(),
});
export type LaunchTenderOfferInput = z.infer<typeof launchTenderOfferInputSchema>;

export const tenderSharesInputSchema = z.object({
  percentage: z.number().min(MIN_TENDER_PERCENTAGE).max(100),
});
export type TenderSharesInput = z.infer<typeof tenderSharesInputSchema>;
