import { COMMODITY_TRADE_FEE_RATE, MAX_POOL_DRAIN_RATIO } from "@patrimoine-jeu/domain";

/**
 * Bourse des matières premières — marché à liquidité automatique (AMM,
 * formule à produit constant, comme Uniswap) : (cf. domain/commodity.ts
 * pour les constantes de calibrage). Chaque échange déplace le prix le
 * long de la courbe reserveIn × reserveOut = k, sans carnet d'ordres à
 * faire matcher — toujours possible d'acheter ou de vendre.
 */

/** Prix courant (€/unité) d'un marché : simple ratio des deux réserves. */
export function computeSpotPrice(commodityReserve: number, cashReserve: number): number {
  if (commodityReserve <= 0) return 0;
  return cashReserve / commodityReserve;
}

/**
 * Sortie obtenue pour une entrée donnée (formule à produit constant avec
 * frais prélevés sur l'entrée, comme Uniswap v2) : achat (reserveIn=cash,
 * reserveOut=matière) ou vente (reserveIn=matière, reserveOut=cash) utilisent
 * la même formule, juste avec les réserves inversées.
 */
export function computeAmmSwapOutput(reserveIn: number, reserveOut: number, amountIn: number): number {
  if (amountIn <= 0 || reserveIn <= 0 || reserveOut <= 0) return 0;
  const amountInWithFee = amountIn * (1 - COMMODITY_TRADE_FEE_RATE);
  return (reserveOut * amountInWithFee) / (reserveIn + amountInWithFee);
}

/** Quantité maximale de la réserve `reserveOut` échangeable en une seule transaction (cf. MAX_POOL_DRAIN_RATIO). */
export function computeMaxTradeOutput(reserveOut: number): number {
  return reserveOut * MAX_POOL_DRAIN_RATIO;
}

export interface CommodityPoolGrowth {
  commodityReserve: number;
  cashReserve: number;
}

/**
 * Approfondit le pool si la population de joueurs a grandi (jamais ne le
 * réduit) : la trésorerie est mise à l'échelle dans le même ratio que la
 * matière, pour que le prix (cash/matière) ne bouge PAS à cause de l'ajout
 * de liquidité lui-même — seuls les échanges des joueurs font bouger le
 * prix.
 */
export function computeCommodityPoolGrowth(
  currentCommodityReserve: number,
  currentCashReserve: number,
  targetCommodityReserve: number,
): CommodityPoolGrowth {
  if (targetCommodityReserve <= currentCommodityReserve || currentCommodityReserve <= 0) {
    return { commodityReserve: currentCommodityReserve, cashReserve: currentCashReserve };
  }
  const growthFactor = targetCommodityReserve / currentCommodityReserve;
  return { commodityReserve: targetCommodityReserve, cashReserve: currentCashReserve * growthFactor };
}
