import { z } from "zod";

/**
 * Rachat amical d'entreprise (cf. section 12septies du document de
 * conception) — négociation privée directe entre le vendeur (actionnaire
 * principal) et le(s) acheteur(s) intéressé(s), avec mise en concurrence
 * si plusieurs se manifestent : à la différence de l'OPA hostile
 * (tender-offer.ts, prix fixé par l'ACHETEUR, ouverte à tous les
 * actionnaires sans consentement) et du marché secondaire classique
 * (company.ts ListShareInput, premier acheteur au prix fixé par le
 * vendeur), ici c'est le VENDEUR qui ouvre une annonce, plusieurs
 * acheteurs proposent CHACUN leur propre prix (visibles seulement du
 * vendeur — "négociation privée"), et le vendeur choisit librement laquelle
 * accepter, y compris en dessous de la valeur comptable (vente volontaire,
 * pas de prime minimale imposée contrairement à l'OPA).
 */

export const SALE_LISTING_DURATION_CYCLES = 14;
export const MIN_SALE_PERCENTAGE = 0.01;

export const createSaleListingInputSchema = z.object({
  sharePercentage: z.number().min(MIN_SALE_PERCENTAGE).max(100),
  /** Prix indicatif par 1% de parts — purement informatif, n'engage pas le vendeur à accepter une offre à ce niveau. */
  askingPricePerPercent: z.number().positive().optional(),
});
export type CreateSaleListingInput = z.infer<typeof createSaleListingInputSchema>;

export const submitSaleBidInputSchema = z.object({
  pricePerPercent: z.number().positive(),
});
export type SubmitSaleBidInput = z.infer<typeof submitSaleBidInputSchema>;
