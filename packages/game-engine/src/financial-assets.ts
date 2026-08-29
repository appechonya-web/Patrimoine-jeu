import { type AssetRiskLevel, CYCLES_PER_YEAR, MIN_ASSET_PRICE } from "@patrimoine-jeu/domain";

/** Traduit la volatilité brute d'un actif (cf. domain/financial-assets.ts) en repère lisible, affiché avant achat. */
export function computeAssetRiskLevel(volatility: number): AssetRiskLevel {
  if (volatility < 0.008) return "low";
  if (volatility < 0.02) return "moderate";
  if (volatility < 0.04) return "high";
  return "extreme";
}

/**
 * Marche aléatoire propre à chaque actif — dérive + volatilité (cf.
 * domain/financial-assets.ts) — plafonnée à un prix plancher pour éviter
 * qu'un actif tombe à zéro ou en négatif après beaucoup de cycles.
 * sectoralDriftBump (défaut 0) s'ajoute à la dérive pour les actions
 * rattachées à un secteur en pleine crise/boom national (cf.
 * FINANCIAL_ASSET_SECTORAL_DRIFT_SENSITIVITY, appliqué côté cycles.ts).
 */
export function computeNextAssetPrice(
  currentPrice: number,
  drift: number,
  volatility: number,
  sectoralDriftBump = 0,
): number {
  const randomShock = (Math.random() - 0.5) * 2 * volatility;
  const nextPrice = currentPrice * (1 + drift + sectoralDriftBump + randomShock);
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

export interface AssetDividendResult {
  grossDividend: number;
  tax: number;
  netDividend: number;
}

/**
 * Dividende versé chaque cycle par une action détenue (cf.
 * domain/financial-assets.ts dividendRate — 0 pour les actions de
 * croissance, la crypto et l'art). Même franchise à vie et même taux que le
 * reste des revenus d'investissement du jeu (cf. computeCapitalGainsTax,
 * game-engine/savings.ts computeSavingsInterest) : un seul concept fiscal
 * de "revenu d'investissement", pas un régime séparé pour le dividende.
 */
export function computeAssetDividend(
  quantity: number,
  price: number,
  annualDividendRate: number,
  exemptionRemaining: number,
  capitalGainsRate: number,
): AssetDividendResult {
  const grossDividend = quantity * price * (annualDividendRate / CYCLES_PER_YEAR);
  const taxableAmount = Math.max(0, grossDividend - Math.max(0, exemptionRemaining));
  const tax = taxableAmount * capitalGainsRate;
  return { grossDividend, tax, netDividend: grossDividend - tax };
}
