import { z } from "zod";

/**
 * Immobilier — les modèles Property/Listing/Bid/Lease existaient déjà dans
 * le schéma (scaffold jamais branché) mais aucune logique n'y était liée.
 * Achat/revente à prix fixe (comme le marché des parts d'entreprise),
 * location à des locataires NPC pour un revenu passif, et enchères
 * (cf. property-auction.ts pour Listing.isAuction / Bid).
 */

/**
 * Dégradation de l'état d'un bien (0-100) à chaque cycle — même vacant, un
 * bien s'use un peu (entretien) ; loué, l'usage du locataire double
 * l'usure. Calibré pour perdre l'essentiel de sa valeur en plusieurs années
 * sans entretien, cohérent avec le rythme du jeu.
 */
export const PROPERTY_CONDITION_DECAY_PER_CYCLE = 0.05;
export const PROPERTY_CONDITION_DECAY_RENTED_MULTIPLIER = 2;

/**
 * Le loyer perçu est réduit au prorata de l'état du bien — négliger
 * l'entretien coûte directement en revenu. Coût de rénovation exprimé en
 * fraction de la valeur du bien (une pleine rénovation 0→100 coûte 15% de
 * sa valeur) plutôt qu'un montant fixe — restaurer un parking et un bien de
 * luxe n'ont pas la même échelle.
 */
export const RENOVATION_COST_RATIO = 0.15;

export const MIN_LISTING_PRICE = 100;

/**
 * Droits d'enregistrement — un vrai coût d'achat immobilier belge (12-12,5%
 * du prix), jusqu'ici totalement absent du jeu alors que les taux réels par
 * région existaient déjà (Municipality.registrationDutyRate /
 * registrationDutyRateOwnHome, cf. seed.ts). Le taux réduit "abattement
 * première habitation" s'applique à un bien résidentiel (pas un parking, pas
 * un commerce) si l'acheteur n'en possède encore aucun autre — un vrai
 * levier légal : c'est TON premier chez-toi qui compte, pas le suivant.
 */
export const RESIDENTIAL_PROPERTY_TYPES = ["APARTMENT", "HOUSE", "LUXURY"] as const;

export const listPropertyForSaleInputSchema = z.object({
  price: z.number().min(MIN_LISTING_PRICE),
});
export type ListPropertyForSaleInput = z.infer<typeof listPropertyForSaleInputSchema>;

/**
 * Immobilier de prestige personnalisable (cf. section 11 du document de
 * conception) — "statut social visible, sans avantage économique direct" :
 * réservé au type LUXURY (le haut de gamme, cf. RESIDENTIAL_PROPERTY_TYPES),
 * un nom personnalisé purement cosmétique, sans effet sur baseRent,
 * marketValue ni condition. Visible publiquement (cf.
 * properties.service.ts listPrestigeProperties) — c'est tout l'intérêt
 * d'un statut social.
 */
export const MAX_PROPERTY_CUSTOM_NAME_LENGTH = 40;

export const setPropertyCustomNameInputSchema = z.object({
  /** null retire le nom personnalisé. */
  customName: z.string().trim().min(1).max(MAX_PROPERTY_CUSTOM_NAME_LENGTH).nullable(),
});
export type SetPropertyCustomNameInput = z.infer<typeof setPropertyCustomNameInputSchema>;
