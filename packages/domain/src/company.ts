import { z } from "zod";

/**
 * Coût de fondation pour une entreprise de niveau 0 (matières premières) —
 * accessible sans condition (section 8 du document de conception).
 */
export const STARTUP_COST_LEVEL_0 = 4_000;

/**
 * Coût de fondation pour une entreprise de niveau 1 (transformation) —
 * s'approvisionne en matières premières auprès d'entreprises de niveau 0
 * du même secteur parent via SupplyContract (cf. game-engine/supply-chain.ts).
 * Capital nettement plus élevé + condition d'expérience (avoir déjà
 * possédé une entreprise dans le secteur parent, cf. companies.service.ts)
 * plutôt qu'un simple palier de prix, comme demandé par le document de
 * conception ("capital et expérience minimale").
 */
export const STARTUP_COST_LEVEL_1 = 15_000;

/**
 * Salaire récurrent d'un manager NPC, déduit des coûts de l'entreprise à
 * chaque cycle. Calibré à l'origine pour un cycle hebdomadaire (150 €),
 * divisé par 7 pour un cycle quotidien. Le passage au cycle horaire
 * (CYCLE_DURATION_MS, apps/worker) ne change rien ici : ce montant reste
 * correct par cycle, seule la fréquence réelle des cycles a changé — même
 * logique pour EMPLOYEE_TIER_CATALOG plus bas.
 */
export const MANAGER_SALARY_PER_CYCLE = 21.43;

/**
 * Managers embauchables en pilote semi-automatique (cf. section 12sexies du
 * document de conception) — "surtout, allège la charge de travail donc
 * protège le bien-être". Sans manager, chaque entreprise active pilotée
 * personnellement (actionnaire principal) draine un peu de bien-être par
 * cycle, représentant la charge réelle de la gérer soi-même ; un manager
 * embauché (cf. hasManager, MANAGER_SALARY_PER_CYCLE) supprime ce drain
 * pour SON entreprise — la vraie contrepartie au salaire versé, en plus du
 * bonus d'attractivité et de la levée de la pénalité d'attention divisée
 * déjà en place (cf. game-engine/companies.ts). Calibré comme les autres
 * drains de bien-être (cycle quotidien, cf. wellbeing.ts).
 */
export const UNMANAGED_COMPANY_WELLBEING_DRAIN_PER_CYCLE = 0.08 / 7;

/**
 * Employés NPC par palier de qualification — le salaire ET la contribution
 * à la production diffèrent par palier (cf. packages/game-engine/src/companies.ts
 * pour la formule d'application). Le rendement par euro dépensé progresse
 * légèrement avec la qualification (spécialiste : ~20% plus rentable par €
 * qu'un non qualifié), pour que payer plus cher un employé qualifié soit un
 * vrai choix, pas une pénalité déguisée. Salaires calibrés à l'origine pour
 * un cycle hebdomadaire, divisés par 7 pour un cycle quotidien.
 */
export const EMPLOYEE_TIERS = ["unskilled", "qualified", "specialist"] as const;
export type EmployeeTier = (typeof EMPLOYEE_TIERS)[number];

export interface EmployeeTierDefinition {
  id: EmployeeTier;
  label: string;
  salaryPerCycle: number;
  baseContribution: number;
}

/**
 * baseContribution doublé (0.08/0.16/0.32 à l'origine) — au salaire
 * d'origine, même un spécialiste à moral et ancienneté CORRECTS (70/100,
 * quelques semaines) ne rapportait qu'environ 26 € de capacité
 * supplémentaire sur la gamme de base (marge ~7 €/unité) pour 57 € de
 * salaire : structurellement non rentable même en bonne gestion, pas
 * seulement en début de carrière. Le doublement s'applique uniformément aux
 * 4 effets par département (production, ventes, R&D, RH — cf.
 * game-engine/companies.ts computeDepartmentContribution), donc l'ordre
 * relatif entre paliers ne change pas.
 */
export const EMPLOYEE_TIER_CATALOG: Record<EmployeeTier, EmployeeTierDefinition> = {
  unskilled: { id: "unskilled", label: "Non qualifié", salaryPerCycle: 17.14, baseContribution: 0.16 },
  qualified: { id: "qualified", label: "Qualifié", salaryPerCycle: 31.43, baseContribution: 0.32 },
  specialist: { id: "specialist", label: "Spécialisé", salaryPerCycle: 57.14, baseContribution: 0.64 },
};

/**
 * Fonder une entreprise supplémentaire ne doit pas être une simple option :
 * il faut avoir fait ses preuves sur au moins une entreprise existante (un
 * vrai historique de succès, pas une formalité). Les deux seuils doivent
 * être atteints ensemble par au moins une des entreprises déjà possédées.
 */
export const EXPANSION_MIN_CYCLES_ACTIVE = 728; // ~1 mois à raison d'un cycle par heure (728h ≈ 30,3 jours)
export const EXPANSION_MIN_CUMULATIVE_NET_PROFIT = 20_000;

/** Chaque entreprise supplémentaire coûte plus cher à fonder que la précédente. */
export const ADDITIONAL_COMPANY_COST_MULTIPLIER = 2;

/**
 * Faillite (section 10 du document de conception, "faillite et fresh
 * start") : une entreprise dont les pertes nettes cumulées franchissent ce
 * seuil négatif passe en statut BANKRUPT à la clôture du cycle qui l'y
 * fait basculer — même ordre de grandeur que EXPANSION_MIN_CUMULATIVE_NET_PROFIT,
 * en miroir négatif. Les prêts actifs sont effacés (la banque encaisse la
 * perte, comme un défaut de paiement classique), les actionnaires ne
 * récupèrent rien — responsabilité limitée au capital déjà investi, le
 * patrimoine personnel du joueur n'est jamais entamé au-delà de ça
 * ("fresh start" : rien n'empêche de refonder ensuite).
 */
export const BANKRUPTCY_CUMULATIVE_LOSS_THRESHOLD = -20_000;
export const COMPANY_BANKRUPTCY_REPUTATION_PENALTY = 20;

export const createCompanyInputSchema = z.object({
  name: z.string().min(2).max(64),
  sectorId: z.string().uuid(),
  municipalityId: z.string().uuid(),
});

export type CreateCompanyInput = z.infer<typeof createCompanyInputSchema>;

/**
 * Onze leviers d'amélioration indépendants — chacun a un effet mécanique
 * distinct sur la chaîne production → demande → vente (cf.
 * packages/game-engine/src/companies.ts, runProductionCycle) :
 * - marketing : plus de demande (clientèle touchée), amplifie les
 *   événements marketing positifs
 * - quality : le marché tolère un prix plus élevé sans perdre de demande,
 *   mais des intrants/process plus soignés coûtent plus cher par unité
 *   produite — un vrai compromis, pas un simple bonus ; amortit les
 *   scandales qualité
 * - equipment : plus de capacité de production (unités/cycle), amortit les
 *   pannes
 * - workConditions : meilleure efficacité par employé (donc capacité),
 *   réputation passive, amortit les conflits sociaux
 * - reserve : trésorerie qui absorbe une partie de toute perte liée à un
 *   événement négatif, quel qu'il soit
 * - automation : réduit le coût de production par unité (des machines
 *   remplacent le travail manuel répétitif)
 * - branding : amortit TOUS les événements négatifs, ET rend la demande
 *   moins sensible au prix (fidélité de marque)
 * - innovation (R&D) : amplifie TOUS les événements positifs, ET débloque de
 *   nouvelles gammes de produits à lancer (cf. PRODUCT_CATALOG) — chacune
 *   avec une économie distincte, pas juste "plus du même produit"
 * - training (formation) : booste la capacité de production de chaque
 *   employé déjà en poste — une alternative à l'embauche plutôt qu'un
 *   doublon
 * - safety (sécurité) : protège spécifiquement l'événement "employés"
 *   négatif (accident), désormais séparé de workConditions
 * - insurance (assurance) : plafonne la perte maximale d'un seul événement
 *   négatif, en plus de ce que la réserve peut absorber
 */
export const INVESTMENT_AXES = [
  "marketing",
  "quality",
  "equipment",
  "workConditions",
  "reserve",
  "automation",
  "branding",
  "innovation",
  "training",
  "safety",
  "insurance",
] as const;
export type InvestmentAxis = (typeof INVESTMENT_AXES)[number];

export const INVESTMENT_AXIS_LABELS: Record<InvestmentAxis, string> = {
  marketing: "Marketing",
  quality: "Qualité",
  equipment: "Équipement",
  workConditions: "Conditions de travail",
  reserve: "Réserve de trésorerie",
  automation: "Automatisation",
  branding: "Image de marque",
  innovation: "R&D / Innovation",
  training: "Formation professionnelle",
  safety: "Sécurité au travail",
  insurance: "Assurance",
};

export const MIN_INVESTMENT_AMOUNT = 100;

/**
 * Multiplicateur du coût cumulé requis par niveau (cf.
 * packages/game-engine/src/companies.ts, computeInvestmentLevel :
 * niveau = racine(investissement cumulé / INVESTMENT_LEVEL_SCALE)).
 * Porte le coût du niveau 100 à 50 000 € (au lieu de 10 000 €) — un axe
 * poussé à fond doit demander un vrai engagement dans la durée, pas
 * quelques jours, pour forcer à se concentrer sur peu d'axes/entreprises
 * plutôt que de tout maximiser sans effort. Les premiers niveaux restent
 * rapides (la courbe en racine carrée est conservée) : seule l'ampleur
 * globale change.
 */
export const INVESTMENT_LEVEL_SCALE = 5;

/**
 * Plafond par action d'investissement, combiné à un cooldown de
 * ACTION_COOLDOWN_CYCLES par levier (cf. CompanyActionCooldown) :
 * impossible d'accélérer une amélioration en y mettant plus d'argent d'un
 * coup. Pour atteindre le niveau 100 d'un levier (50 000 € cumulés, cf.
 * INVESTMENT_LEVEL_SCALE et computeInvestmentLevel), il faut au moins 100
 * actions, espacées de 7 cycles chacune — toujours ~700 cycles (environ 29
 * jours à raison d'1 cycle/heure), quel que soit le capital disponible.
 */
export const MAX_INVESTMENT_PER_CYCLE = 500;

/**
 * Une seule action (investissement dans un levier donné, ou embauche) par
 * entreprise tous les ACTION_COOLDOWN_CYCLES cycles — pas juste "une fois
 * par cycle". Avec un cycle horaire, ça équivaut à une fois toutes les 7
 * heures : c'est le temps qui limite la progression, jamais l'argent
 * disponible.
 */
export const ACTION_COOLDOWN_CYCLES = 7;

export const investCompanyInputSchema = z.object({
  axis: z.enum(INVESTMENT_AXES),
  amount: z.number().min(MIN_INVESTMENT_AMOUNT).max(MAX_INVESTMENT_PER_CYCLE),
});

export type InvestCompanyInput = z.infer<typeof investCompanyInputSchema>;

/**
 * Expansion de capacité (second site de production) — contrairement aux 10
 * leviers ci-dessus, PAS de plafond par action ni de cooldown : le seul
 * endroit du jeu où l'argent disponible compte vraiment sans limite de
 * rythme, à rendements décroissants (racine carrée, comme le reste du jeu)
 * mais sans palier 100 — un joueur avec des millions voit un effet
 * immédiat. La capacité en trop par rapport à ce que le marché peut
 * absorber part en stock à coût de possession (cf.
 * STOCK_HOLDING_COST_PER_UNIT) — un vrai plafond économique organique,
 * pas un mur artificiel.
 */
export const MIN_CAPACITY_EXPANSION_AMOUNT = 500;
export const CAPACITY_EXPANSION_SCALE = 20_000;

export const investInCapacityExpansionInputSchema = z.object({
  amount: z.number().min(MIN_CAPACITY_EXPANSION_AMOUNT),
});
export type InvestInCapacityExpansionInput = z.infer<typeof investInCapacityExpansionInputSchema>;

/**
 * Campagne marketing de masse — effet TEMPORAIRE (contrairement au levier
 * marketing classique, permanent), pour ne pas le rendre obsolète : une
 * grosse dépense ponctuelle donne un vrai coup de fouet à la compétitivité,
 * qui s'éteint après MASS_MARKETING_CAMPAIGN_DURATION_CYCLES. Comme
 * l'expansion de capacité, pas de plafond par action ni de cooldown.
 */
export const MIN_MASS_MARKETING_CAMPAIGN_AMOUNT = 500;
export const MASS_MARKETING_CAMPAIGN_SCALE = 5_000;
export const MASS_MARKETING_CAMPAIGN_DURATION_CYCLES = 30;

export const launchMassMarketingCampaignInputSchema = z.object({
  amount: z.number().min(MIN_MASS_MARKETING_CAMPAIGN_AMOUNT),
});
export type LaunchMassMarketingCampaignInput = z.infer<typeof launchMassMarketingCampaignInputSchema>;

// hireEmployeeInputSchema a déménagé dans ./organization.ts (le recrutement
// exige désormais un département en plus du palier de qualification).

/**
 * Marché des parts — le prix est fixé librement par le vendeur, pas calculé
 * par une formule de valorisation : c'est le jugement des autres joueurs
 * (achètent-ils, à ce prix ?) qui fait la "meilleure valorisation".
 */
export const listShareInputSchema = z.object({
  sharePercentage: z.number().min(0.01).max(100),
  price: z.number().min(1),
});

export type ListShareInput = z.infer<typeof listShareInputSchema>;

/** Si l'achat d'une cotation est fait pour le compte d'une entreprise contrôlée par le joueur (holding) plutôt qu'en son nom propre. */
export const buyShareListingInputSchema = z.object({
  acquirerCompanyId: z.string().optional(),
});
export type BuyShareListingInput = z.infer<typeof buyShareListingInputSchema>;

// --- Production & produit --------------------------------------------------

/**
 * Une entreprise ne "génère" plus un revenu abstrait proportionnel à son
 * attractivité : elle produit un produit/service concret, en quantité
 * limitée par sa capacité (équipement + effectif), et le vend à un prix fixé
 * par le joueur face à une demande qui réagit à ce prix (cf.
 * packages/game-engine/src/companies.ts, runProductionCycle). Produire plus
 * que la demande n'est pas perdu : l'excédent part en stock (coûteux à
 * garder, plafonné avant péremption) plutôt que jeté immédiatement — de
 * quoi lisser un pic de demande futur.
 */
export const BASE_UNIT_COST = 5;
export const QUALITY_MAX_UNIT_COST_INCREASE = 0.3;
export const AUTOMATION_MAX_UNIT_COST_REDUCTION = 0.35;

/** Capacité qu'un fondateur seul, sans équipement ni employé, peut produire et écouler. */
export const BASE_CAPACITY_NO_EMPLOYEES = 7;

/** Prix et demande de référence pour ce MVP niveau 0 (marché générique, pas encore différencié par secteur). */
export const REFERENCE_UNIT_PRICE = 12;
export const DEFAULT_UNIT_PRICE = REFERENCE_UNIT_PRICE;
export const MIN_UNIT_PRICE = 1;
export const MAX_UNIT_PRICE_RATIO = 5;
export const BASE_DEMAND_UNITS = 7;
export const PRICE_ELASTICITY_BASE = 1.6;
export const BRANDING_MAX_ELASTICITY_REDUCTION = 0.6;
export const QUALITY_MAX_PRICE_TOLERANCE = 0.4;
export const DEMAND_PRICE_MULTIPLIER_CAP = 3;

/** Stock maximal exprimé en multiple de la capacité d'un cycle ; au-delà, l'excédent périme au lieu de s'accumuler indéfiniment. */
export const MAX_STOCK_CYCLES = 3;
export const STOCK_HOLDING_COST_PER_UNIT = 0.3;

// --- Gammes de produits (R&D) -----------------------------------------------

/**
 * Chaque entreprise démarre avec une seule gamme ("core", toujours
 * débloquée). Le levier "innovation" (R&D) débloque progressivement des
 * gammes supplémentaires, chacune avec sa PROPRE économie — pas un simple
 * doublon du produit existant : un marché de niche à forte marge, un marché
 * de masse à faible marge, un produit qui continue de profiter de chaque
 * palier de R&D ultérieur. Chaque gamme active a sa propre demande, son
 * propre stock et son propre prix ; elles se partagent la capacité de
 * production totale de l'entreprise (cf. Product.capacityAllocation) — un
 * vrai arbitrage, pas une capacité qui se démultiplie gratuitement à chaque
 * lancement.
 */
export const PRODUCT_TYPES = ["core", "economique", "premium", "innovant"] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

export interface ProductTypeDefinition {
  id: ProductType;
  label: string;
  description: string;
  /** Niveau de R&D (levier innovation) requis pour pouvoir lancer cette gamme ; 0 = toujours débloquée (fondation). */
  unlockInnovationLevel: number;
  /** Multiplicateur de demande de base par rapport à BASE_DEMAND_UNITS. */
  demandMultiplier: number;
  /** Multiplicateur du prix de référence par rapport à REFERENCE_UNIT_PRICE. */
  referencePriceMultiplier: number;
  /** Multiplicateur du coût de production par unité par rapport à BASE_UNIT_COST. */
  unitCostMultiplier: number;
  /** À quel point la demande de cette gamme continue de croître avec le niveau de R&D après son déblocage (0 = pas d'effet direct au-delà du déblocage). */
  innovationDemandSensitivity: number;
}

export const PRODUCT_CATALOG: Record<ProductType, ProductTypeDefinition> = {
  core: {
    id: "core",
    label: "Produit de base",
    description: "La gamme de fondation, toujours active — économie équilibrée, référence pour toutes les autres.",
    unlockInnovationLevel: 0,
    demandMultiplier: 1,
    referencePriceMultiplier: 1,
    unitCostMultiplier: 1,
    innovationDemandSensitivity: 0,
  },
  economique: {
    id: "economique",
    label: "Gamme économique",
    description: "Volume élevé, marge unitaire faible — touche une clientèle plus large à prix cassé.",
    unlockInnovationLevel: 15,
    demandMultiplier: 2,
    referencePriceMultiplier: 0.6,
    unitCostMultiplier: 0.7,
    innovationDemandSensitivity: 0,
  },
  premium: {
    id: "premium",
    label: "Gamme premium",
    description: "Marché restreint mais marge élevée — rentabilise fortement un investissement qualité.",
    unlockInnovationLevel: 35,
    demandMultiplier: 0.45,
    referencePriceMultiplier: 2.2,
    unitCostMultiplier: 1.9,
    innovationDemandSensitivity: 0,
  },
  innovant: {
    id: "innovant",
    label: "Produit de rupture",
    description: "Continue de profiter de chaque nouveau palier de R&D après son lancement, contrairement aux autres gammes.",
    unlockInnovationLevel: 60,
    demandMultiplier: 0.7,
    referencePriceMultiplier: 1.6,
    unitCostMultiplier: 1.4,
    innovationDemandSensitivity: 0.6,
  },
};

/** Coût de lancement d'une nouvelle gamme (hors la gamme "core", offerte à la fondation). */
export const PRODUCT_LAUNCH_COST = 1_500;

/**
 * Le lancement d'une gamme est un engagement, comme les leviers
 * d'investissement : soumis au même cooldown (ACTION_COOLDOWN_CYCLES),
 * impossible de lancer une nouvelle gamme chaque cycle avec assez d'argent.
 */
export const launchProductInputSchema = z.object({
  type: z.enum(PRODUCT_TYPES),
});

export type LaunchProductInput = z.infer<typeof launchProductInputSchema>;

/**
 * Le prix est un levier opérationnel, pas un investissement à long terme :
 * ajustable librement à chaque cycle (pas de cooldown), contrairement aux
 * onze leviers d'investissement ci-dessus. Chaque gamme a son propre prix.
 */
export const setPriceInputSchema = z.object({
  unitPrice: z.number().min(MIN_UNIT_PRICE).max(REFERENCE_UNIT_PRICE * MAX_UNIT_PRICE_RATIO * 3),
});

export type SetPriceInput = z.infer<typeof setPriceInputSchema>;

/**
 * Répartition de la capacité de production entre les gammes actives — la
 * gamme "core" absorbe automatiquement ce qui reste (100 - somme des
 * autres), elle n'est jamais réglée directement : impossible de retirer
 * toute capacité à toutes les gammes à la fois.
 */
export const setProductAllocationInputSchema = z.object({
  capacityAllocation: z.number().min(0).max(100),
});

export type SetProductAllocationInput = z.infer<typeof setProductAllocationInputSchema>;
