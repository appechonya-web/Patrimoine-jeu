import { z } from "zod";

/**
 * Bourse d'actifs financiers — actions, crypto, art. Distincte du marché de
 * matières premières (domain/commodity.ts, un AMM alimenté par une réserve)
 * : ici le prix suit une marche aléatoire propre à chaque actif (dérive +
 * volatilité, cf. game-engine/financial-assets.ts), recalculée à chaque
 * clôture de cycle — pas de réserve, pas de pool partagé entre joueurs.
 * Catalogue volontairement restreint au départ (comme les autres
 * catalogues du jeu) : l'étoffer plus tard est une pure question de
 * données. La plus-value réalisée à la revente est taxée comme celle de
 * l'épargne (même franchise à vie, PlayerStats.cumulativeInvestmentGains,
 * même taux — cf. TaxRuleSet.capitalGainsRate) : un seul concept fiscal de
 * "plus-value", pas un régime séparé par produit.
 */

export const FINANCIAL_ASSET_TYPES = ["stock", "crypto", "art"] as const;
export type FinancialAssetType = (typeof FINANCIAL_ASSET_TYPES)[number];

export const FINANCIAL_ASSET_TYPE_LABELS: Record<FinancialAssetType, string> = {
  stock: "Action",
  crypto: "Cryptomonnaie",
  art: "Art & collection",
};

export interface FinancialAssetDefinition {
  key: string;
  name: string;
  type: FinancialAssetType;
  startPrice: number;
  /** Dérive moyenne par cycle, en proportion (0.0005 = +0.05%/cycle en moyenne). */
  drift: number;
  /** Volatilité par cycle, en proportion — écart-type approximatif de la marche aléatoire. */
  volatility: number;
}

export const FINANCIAL_ASSET_CATALOG: Record<string, FinancialAssetDefinition> = {
  nordtech: {
    key: "nordtech",
    name: "NordTech SA",
    type: "stock",
    startPrice: 48,
    drift: 0.0004,
    volatility: 0.015,
  },
  "wallonie-energie": {
    key: "wallonie-energie",
    name: "Wallonie Énergie",
    type: "stock",
    startPrice: 22,
    drift: 0.0002,
    volatility: 0.008,
  },
  bitbe: {
    key: "bitbe",
    name: "BitBE",
    type: "crypto",
    startPrice: 310,
    drift: 0.0006,
    volatility: 0.05,
  },
  etherbrux: {
    key: "etherbrux",
    name: "EtherBrux",
    type: "crypto",
    startPrice: 95,
    drift: 0.0003,
    volatility: 0.045,
  },
  "toile-magritte": {
    key: "toile-magritte",
    name: "Toile (atelier Magritte)",
    type: "art",
    startPrice: 2_400,
    drift: 0.0003,
    volatility: 0.006,
  },
};
export const FINANCIAL_ASSET_LIST: FinancialAssetDefinition[] = Object.values(FINANCIAL_ASSET_CATALOG);

export const MIN_ASSET_PRICE = 0.01;
export const MIN_ASSET_BUY_AMOUNT = 5;

export const buyAssetInputSchema = z.object({
  amount: z.number().min(MIN_ASSET_BUY_AMOUNT),
});
export type BuyAssetInput = z.infer<typeof buyAssetInputSchema>;

export const sellAssetInputSchema = z.object({
  quantity: z.number().positive(),
});
export type SellAssetInput = z.infer<typeof sellAssetInputSchema>;
