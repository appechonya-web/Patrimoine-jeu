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
  /**
   * Nom du Sector (packages/db) auquel cette action est rattachée, ou null
   * pour un actif non corrélé (les deux actions "généralistes" existantes,
   * la crypto, l'art). Une action rattachée subit un supplément de dérive
   * quand un aléa sectoriel NATIONAL (MAJEUR/EXCEPTIONNEL, cf.
   * domain/sectoral-events.ts) touche ce secteur — cf.
   * FINANCIAL_ASSET_SECTORAL_DRIFT_SENSITIVITY et
   * game-engine/cycles.ts. Les aléas RÉGIONAUX (mineurs/moyens) ne
   * touchent jamais la bourse, seulement l'attractivité locale des
   * entreprises : il n'existe pas d'action "régionale".
   */
  sectorName: string | null;
  /**
   * Rendement annuel du dividende, en proportion du cours (0.03 = 3%/an) —
   * réservé aux actions (jamais crypto/art, fidèle à la réalité), et à 0
   * pour une action de croissance qui préfère réinvestir ses profits plutôt
   * que les redistribuer (les PME/coopératives spéculatives du catalogue).
   * Distribué chaque cycle au prorata (annualRate / CYCLES_PER_YEAR), cf.
   * game-engine/financial-assets.ts computeAssetDividend — CASH ou REINVEST
   * selon PlayerAssetHolding.dividendPolicy.
   */
  dividendRate: number;
}

/**
 * Fraction de l'écart du multiplicateur sectoriel national (cf.
 * computeSectoralDemandMultiplier) répercutée chaque cycle sur la dérive
 * d'une action rattachée à ce secteur, tant que l'aléa est actif. Calibré
 * pour qu'un MAJEUR (magnitude ~0.2 à 0.45, ~40 cycles) déplace le cours
 * de l'ordre de +/-25 à 45% sur toute sa durée, et qu'un EXCEPTIONNEL
 * (magnitude ~0.45 à 0.9, ~80 cycles) puisse le doubler ou l'effondrer —
 * un vrai choc de marché, pas un bruit de fond.
 */
export const FINANCIAL_ASSET_SECTORAL_DRIFT_SENSITIVITY = 0.015;

export const FINANCIAL_ASSET_CATALOG: Record<string, FinancialAssetDefinition> = {
  nordtech: {
    key: "nordtech",
    name: "NordTech SA",
    type: "stock",
    startPrice: 48,
    drift: 0.0004,
    volatility: 0.015,
    sectorName: null,
    dividendRate: 0.02,
  },
  "wallonie-energie": {
    key: "wallonie-energie",
    name: "Wallonie Énergie",
    type: "stock",
    startPrice: 22,
    drift: 0.0002,
    volatility: 0.008,
    sectorName: null,
    // Les utilities versent traditionnellement de gros dividendes dans la
    // vraie vie (croissance lente, flux de trésorerie stable) — le taux le
    // plus élevé du catalogue, à l'image du secteur réel.
    dividendRate: 0.045,
  },
  bitbe: {
    key: "bitbe",
    name: "BitBE",
    type: "crypto",
    startPrice: 310,
    drift: 0.0006,
    volatility: 0.05,
    sectorName: null,
    dividendRate: 0,
  },
  etherbrux: {
    key: "etherbrux",
    name: "EtherBrux",
    type: "crypto",
    startPrice: 95,
    drift: 0.0003,
    volatility: 0.045,
    sectorName: null,
    dividendRate: 0,
  },
  "toile-magritte": {
    key: "toile-magritte",
    name: "Toile (atelier Magritte)",
    type: "art",
    startPrice: 2_400,
    drift: 0.0003,
    volatility: 0.006,
    sectorName: null,
    dividendRate: 0,
  },
  // Actions sectorielles — deux par secteur réel (packages/db Sector, cf.
  // packages/db/prisma/seed.ts LEVEL_0_SECTORS/LEVEL_1_SECTORS) : une
  // "grande entreprise" plus stable, une "PME/coopérative" plus spéculative.
  // Leur cours réagit aux aléas sectoriels nationaux du même secteur (cf.
  // FINANCIAL_ASSET_SECTORAL_DRIFT_SENSITIVITY) en plus de leur propre
  // marche aléatoire — contrairement aux deux actions généralistes
  // ci-dessus, qui restent hors de portée de ces aléas. Seules les "grandes
  // entreprises" versent un dividende : les PME/coopératives, plus
  // spéculatives, réinvestissent tout — fidèle à la réalité des
  // entreprises en croissance.
  "ardenne-bois": {
    key: "ardenne-bois",
    name: "Ardenne Bois SA",
    type: "stock",
    startPrice: 35,
    drift: 0.0003,
    volatility: 0.009,
    sectorName: "Bois",
    dividendRate: 0.03,
  },
  "sylva-forets": {
    key: "sylva-forets",
    name: "Sylva Forêts Coopérative",
    type: "stock",
    startPrice: 14,
    drift: 0.0005,
    volatility: 0.02,
    sectorName: "Bois",
    dividendRate: 0,
  },
  "wallonie-metaux": {
    key: "wallonie-metaux",
    name: "Wallonie Métaux SA",
    type: "stock",
    startPrice: 40,
    drift: 0.0003,
    volatility: 0.01,
    sectorName: "Métaux",
    dividendRate: 0.035,
  },
  "forge-hainaut": {
    key: "forge-hainaut",
    name: "Forge du Hainaut",
    type: "stock",
    startPrice: 16,
    drift: 0.0005,
    volatility: 0.022,
    sectorName: "Métaux",
    dividendRate: 0,
  },
  agrowallonie: {
    key: "agrowallonie",
    name: "AgroWallonie SA",
    type: "stock",
    startPrice: 30,
    drift: 0.0003,
    volatility: 0.008,
    sectorName: "Agriculture",
    dividendRate: 0.03,
  },
  "ferme-brabant": {
    key: "ferme-brabant",
    name: "Ferme Coopérative Brabant",
    type: "stock",
    startPrice: 12,
    drift: 0.0004,
    volatility: 0.017,
    sectorName: "Agriculture",
    dividendRate: 0,
  },
  "flandre-textile": {
    key: "flandre-textile",
    name: "Flandre Textile SA",
    type: "stock",
    startPrice: 26,
    drift: 0.0002,
    volatility: 0.007,
    sectorName: "Textile brut",
    dividendRate: 0.025,
  },
  "lin-fibres": {
    key: "lin-fibres",
    name: "Lin & Fibres Coopérative",
    type: "stock",
    startPrice: 10,
    drift: 0.0004,
    volatility: 0.016,
    sectorName: "Textile brut",
    dividendRate: 0,
  },
  "carrieres-condroz": {
    key: "carrieres-condroz",
    name: "Carrières du Condroz SA",
    type: "stock",
    startPrice: 38,
    drift: 0.0003,
    volatility: 0.011,
    sectorName: "Extraction",
    dividendRate: 0.03,
  },
  "mines-wallonie": {
    key: "mines-wallonie",
    name: "Mines de Wallonie",
    type: "stock",
    startPrice: 15,
    drift: 0.0006,
    volatility: 0.025,
    sectorName: "Extraction",
    dividendRate: 0,
  },
  "menuiserie-ardennaise": {
    key: "menuiserie-ardennaise",
    name: "Menuiserie Ardennaise SA",
    type: "stock",
    startPrice: 32,
    drift: 0.0003,
    volatility: 0.008,
    sectorName: "Menuiserie",
    dividendRate: 0.025,
  },
  "atelier-bois": {
    key: "atelier-bois",
    name: "Atelier du Bois Group",
    type: "stock",
    startPrice: 13,
    drift: 0.0004,
    volatility: 0.018,
    sectorName: "Menuiserie",
    dividendRate: 0,
  },
  "metallurgie-liegeoise": {
    key: "metallurgie-liegeoise",
    name: "Métallurgie Liégeoise SA",
    type: "stock",
    startPrice: 45,
    drift: 0.0003,
    volatility: 0.01,
    sectorName: "Métallurgie",
    dividendRate: 0.035,
  },
  "acier-sambre": {
    key: "acier-sambre",
    name: "Acier Sambre",
    type: "stock",
    startPrice: 17,
    drift: 0.0005,
    volatility: 0.021,
    sectorName: "Métallurgie",
    dividendRate: 0,
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

export const DIVIDEND_POLICIES = ["CASH", "REINVEST"] as const;
export type DividendPolicy = (typeof DIVIDEND_POLICIES)[number];

export const setDividendPolicyInputSchema = z.object({
  policy: z.enum(DIVIDEND_POLICIES),
});
export type SetDividendPolicyInput = z.infer<typeof setDividendPolicyInputSchema>;
