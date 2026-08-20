import { z } from "zod";

/**
 * Bourse des matières premières — un marché à liquidité automatique (AMM,
 * comme une bourse électronique moderne) par secteur niveau 0 (Bois,
 * Métaux, Agriculture, Textile brut, Extraction), cf.
 * packages/game-engine/src/commodities.ts. Un pool virtuel de matière et de
 * trésorerie existe en permanence : acheter puise dans la matière et
 * augmente la trésorerie du pool (le prix monte), vendre fait l'inverse (le
 * prix baisse) — formule à produit constant, pas de carnet d'ordres à faire
 * matcher, toujours possible d'acheter/vendre.
 */

/**
 * Profondeur du pool par joueur inscrit — recalculée et augmentée à chaque
 * clôture de cycle (cf. game-engine computePoolGrowth), jamais réduite.
 * Avec peu de joueurs, le pool est délibérément peu profond : les premiers
 * arrivants PEUVENT influencer le prix avec des sommes significatives (comme
 * une bourse qui démarre) ; plus la population grandit, plus le marché
 * s'approfondit et se stabilise, jusqu'à devenir difficile à faire bouger
 * pour un seul joueur — comme une vraie place boursière qui prend de la
 * capitalisation.
 */
export const COMMODITY_POOL_PER_PLAYER = 400;
/** Calibré pour un prix de référence d'environ 8 €/unité (cash/matière). */
export const CASH_POOL_PER_PLAYER = 3_200;

/**
 * Frais prélevés sur chaque échange, retenus dans le pool (pas reversés à
 * qui que ce soit) : approfondit légèrement le marché à chaque transaction
 * et décourage les allers-retours achat/vente rapprochés.
 */
export const COMMODITY_TRADE_FEE_RATE = 0.01;

/**
 * Une seule transaction ne peut jamais puiser plus de cette fraction de la
 * réserve de matière du pool — même sur un marché encore peu profond (peu
 * de joueurs), impossible pour un seul joueur de racheter tout le stock
 * disponible d'un coup, quelle que soit sa trésorerie.
 */
export const MAX_POOL_DRAIN_RATIO = 0.3;

export const MIN_TRADE_CASH = 10;
export const MIN_TRADE_UNITS = 1;

export const buyCommodityInputSchema = z.object({
  cashAmount: z.number().min(MIN_TRADE_CASH),
});
export type BuyCommodityInput = z.infer<typeof buyCommodityInputSchema>;

export const sellCommodityInputSchema = z.object({
  units: z.number().min(MIN_TRADE_UNITS),
});
export type SellCommodityInput = z.infer<typeof sellCommodityInputSchema>;
