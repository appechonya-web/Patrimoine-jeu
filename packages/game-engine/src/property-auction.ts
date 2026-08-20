import { BID_INCREMENT_RATIO, MIN_BID_INCREMENT } from "@patrimoine-jeu/domain";

/**
 * Enchères immobilières — cf. domain/property-auction.ts pour le calibrage.
 * Chaque enchérisseur indique un plafond réel (maxAmount) ; le prix affiché
 * ne monte qu'au minimum nécessaire pour dépasser le second, jamais jusqu'au
 * plafond du meneur (proxy bidding façon eBay).
 */

export interface AuctionBidInput {
  playerId: string;
  maxAmount: number;
}

export interface AuctionState {
  currentPrice: number;
  leaderId: string | null;
}

export function computeBidIncrement(currentPrice: number): number {
  return Math.max(MIN_BID_INCREMENT, currentPrice * BID_INCREMENT_RATIO);
}

/** Classe les enchérisseurs par plafond décroissant, un seul (le plus haut) par joueur. */
export function rankBidders(bids: AuctionBidInput[]): { playerId: string; maxAmount: number }[] {
  const maxByPlayer = new Map<string, number>();
  for (const bid of bids) {
    maxByPlayer.set(bid.playerId, Math.max(maxByPlayer.get(bid.playerId) ?? 0, bid.maxAmount));
  }
  return [...maxByPlayer.entries()]
    .map(([playerId, maxAmount]) => ({ playerId, maxAmount }))
    .sort((a, b) => b.maxAmount - a.maxAmount);
}

export function computeAuctionState(startingPrice: number, bids: AuctionBidInput[]): AuctionState {
  const ranked = rankBidders(bids);
  if (ranked.length === 0) return { currentPrice: startingPrice, leaderId: null };
  if (ranked.length === 1) return { currentPrice: startingPrice, leaderId: ranked[0].playerId };

  const [leader, second] = ranked;
  const currentPrice = Math.min(leader.maxAmount, second.maxAmount + computeBidIncrement(second.maxAmount));
  return { currentPrice, leaderId: leader.playerId };
}
