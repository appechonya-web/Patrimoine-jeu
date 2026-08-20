import { MIN_ASSET_PRICE } from "@patrimoine-jeu/domain";

/**
 * Marche aléatoire propre à chaque actif — dérive + volatilité (cf.
 * domain/financial-assets.ts) — plafonnée à un prix plancher pour éviter
 * qu'un actif tombe à zéro ou en négatif après beaucoup de cycles.
 */
export function computeNextAssetPrice(currentPrice: number, drift: number, volatility: number): number {
  const randomShock = (Math.random() - 0.5) * 2 * volatility;
  const nextPrice = currentPrice * (1 + drift + randomShock);
  return Math.max(MIN_ASSET_PRICE, nextPrice);
}

export interface CapitalGainsTaxResult {
  gain: number;
  tax: number;
  net: number;
}

/**
 * Plus-value réalisée à la revente d'un actif financier — même franchise à
 * vie et même taux que les intérêts d'épargne (cf. game-engine/savings.ts
 * computeSavingsInterest) : un seul concept fiscal de "plus-value" partagé
 * entre tous les produits d'investissement du jeu, pas un régime par
 * produit.
 */
export function computeCapitalGainsTax(
  saleProceeds: number,
  costBasisSold: number,
  exemptionRemaining: number,
  capitalGainsRate: number,
): CapitalGainsTaxResult {
  const gain = Math.max(0, saleProceeds - costBasisSold);
  const taxableGain = Math.max(0, gain - Math.max(0, exemptionRemaining));
  const tax = taxableGain * capitalGainsRate;
  return { gain, tax, net: saleProceeds - tax };
}
