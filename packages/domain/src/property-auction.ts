import { z } from "zod";
import { MIN_LISTING_PRICE } from "./property.js";

/**
 * Enchères immobilières — les modèles Listing.isAuction et Bid (avec
 * isProxy/maxProxyAmount) existaient déjà dans le schéma, scaffold jamais
 * branché (cf. property.ts). Enchère "au meilleur prix caché" à l'anglaise
 * façon eBay : chaque enchérisseur indique son plafond réel
 * (maxProxyAmount), le système ne fait monter le prix affiché qu'au minimum
 * nécessaire pour rester devant le second (cf.
 * packages/game-engine/property-auction.ts, computeAuctionState) — jamais
 * de bourrage d'enchère.
 *
 * Durée en temps réel (pas en cycles) : contrairement au reste de
 * l'économie (cadencée en cycles), une enchère est un compte à rebours réel
 * — le suspense d'un "temps qui reste" fait partie du jeu.
 */

export const AUCTION_DURATION_HOURS = 72;

export const MIN_BID_INCREMENT = 10;
export const BID_INCREMENT_RATIO = 0.01;

/**
 * Un enchérisseur gagnant qui ne peut plus payer au règlement (fonds
 * dépensés entretemps ailleurs) perd la vente ET écope d'une pénalité de
 * réputation — une enchère est un engagement, pas juste une intention.
 */
export const AUCTION_WINNER_DEFAULT_REPUTATION_PENALTY = 10;

export const createAuctionInputSchema = z.object({
  startingPrice: z.number().min(MIN_LISTING_PRICE),
});
export type CreateAuctionInput = z.infer<typeof createAuctionInputSchema>;

export const placeBidInputSchema = z.object({
  maxAmount: z.number().positive(),
});
export type PlaceBidInput = z.infer<typeof placeBidInputSchema>;
