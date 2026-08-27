import { computeCompanyBalanceSheet, computeEquipmentBookValue, type CompanyBalanceSheet } from "./finance.js";
import {
  ADDITIONAL_COMPANY_COST_MULTIPLIER,
  AUTOMATION_MAX_UNIT_COST_REDUCTION,
  BANKRUPTCY_CUMULATIVE_LOSS_THRESHOLD,
  BASE_CAPACITY_NO_EMPLOYEES,
  BASE_DEMAND_UNITS,
  BASE_UNIT_COST,
  BRANDING_MAX_ELASTICITY_REDUCTION,
  CORE_MARKET_NPC_REFERENCE_OFFSET,
  DEMAND_PRICE_MULTIPLIER_CAP,
  EMPLOYEE_TIER_CATALOG,
  EMPLOYEE_TIERS,
  HR_STAFF_MORALE_SCALE,
  INFRASTRUCTURE_ECONOMIC_ACTIVITY_CONVERSION,
  INVESTMENT_LEVEL_SCALE,
  MARKET_DEVELOPMENT_SCALE,
  MAX_HR_STAFF_MORALE_BONUS,
  MAX_MARKET_DEVELOPMENT_BONUS,
  MAX_RD_STAFF_INNOVATION_BONUS,
  MAX_SALES_COMPETITIVENESS_BONUS,
  MAX_STOCK_CYCLES,
  MORALE_BASELINE_MAX,
  MORALE_BASELINE_MIN,
  MORALE_DRIFT_RATE,
  MORALE_RANDOM_WALK_RANGE,
  MORALE_UNMANAGED_PENALTY,
  NON_CORE_MARKET_REFERENCE_SIZE,
  POPULATION_DEMAND_SCALE,
  PRICE_ELASTICITY_BASE,
  PRODUCT_CATALOG,
  QUALITY_MAX_PRICE_TOLERANCE,
  QUALITY_MAX_UNIT_COST_INCREASE,
  RD_STAFF_INNOVATION_SCALE,
  REFERENCE_UNIT_PRICE,
  STARTUP_COST_LEVEL_0,
  STOCK_HOLDING_COST_PER_UNIT,
  type ProductType,
} from "@patrimoine-jeu/domain";

/**
 * Fondation et exploitation d'entreprise — niveau 0 (matières premières)
 * uniquement pour l'instant (section 8 du document de conception).
 */

const BASE_ATTRACTIVENESS = 30;
const MAX_SECTOR_XP_BONUS = 40;
// Seuil "en cycles" multiplié par 7 pour garder la même durée réelle (cycle
// quotidien au lieu d'hebdomadaire).
const SECTOR_XP_CYCLES_FOR_MAX_BONUS = 700;

/**
 * Score d'attractivité à la fondation (0-100), figé sur l'entreprise : un
 * fondateur qui a déjà travaillé dans le secteur démarre avec un vrai
 * avantage (section 9 : "croissance plus rapide dans un secteur déjà
 * connu"), plafonné pour ne pas rendre les autres voies inutiles.
 */
export function computeFoundingAttractiveness(founderSectorExperienceCycles: number): number {
  const bonus = Math.min(MAX_SECTOR_XP_BONUS, founderSectorExperienceCycles * (MAX_SECTOR_XP_BONUS / SECTOR_XP_CYCLES_FOR_MAX_BONUS));
  return BASE_ATTRACTIVENESS + bonus;
}

const MANAGER_ATTRACTIVENESS_BONUS = 10;

/** Un manager NPC améliore durablement le fonctionnement de l'entreprise. */
export function computeEffectiveAttractiveness(baseAttractiveness: number, hasManager: boolean): number {
  return baseAttractiveness + (hasManager ? MANAGER_ATTRACTIVENESS_BONUS : 0);
}

const UNMANAGED_MULTI_COMPANY_PENALTY = 0.5;

/**
 * Posséder plusieurs entreprises divise l'attention du dirigeant — sans
 * manager pour prendre le relais, chaque entreprise en pâtit. Une seule
 * entreprise, ou une entreprise dotée d'un manager, n'est pas pénalisée.
 */
export function computeAttentionMultiplier(ownedActiveCompanyCount: number, hasManager: boolean): number {
  if (ownedActiveCompanyCount <= 1 || hasManager) return 1;
  return UNMANAGED_MULTI_COMPANY_PENALTY;
}

const REFERENCE_ATTRACTIVENESS = 50;

/**
 * Coût de fondation, croissant avec le nombre d'entreprises déjà actives —
 * en plus du verrou de maturité (cf. EXPANSION_MIN_CYCLES_ACTIVE /
 * EXPANSION_MIN_CUMULATIVE_NET_PROFIT), fonder ne doit jamais devenir une
 * simple formalité même une fois le seuil de maturité atteint.
 */
export function computeFoundingCost(existingActiveCompanyCount: number, baseCost: number = STARTUP_COST_LEVEL_0): number {
  return baseCost * Math.pow(ADDITIONAL_COMPANY_COST_MULTIPLIER, existingActiveCompanyCount);
}

/** Faillite — cf. domain/company.ts BANKRUPTCY_CUMULATIVE_LOSS_THRESHOLD. */
export function isCompanyBankrupt(cumulativeNetProfit: number): boolean {
  return cumulativeNetProfit <= BANKRUPTCY_CUMULATIVE_LOSS_THRESHOLD;
}

// --- Leviers d'amélioration ----------------------------------------------

/**
 * Rendements décroissants : les premiers euros investis comptent beaucoup
 * plus que les suivants (racine carrée), plafonné à un niveau 100.
 * INVESTMENT_LEVEL_SCALE × 10 000 € cumulés dans un levier atteignent le
 * plafond (50 000 € avec le multiplicateur actuel) — pousser un axe à fond
 * est un engagement de plusieurs années, pas quelques mois.
 */
export function computeInvestmentLevel(cumulativeInvestment: number): number {
  return Math.min(100, Math.sqrt(Math.max(0, cumulativeInvestment) / INVESTMENT_LEVEL_SCALE));
}

export interface CompanyInvestmentLevels {
  marketing: number;
  quality: number;
  equipment: number;
  workConditions: number;
  automation: number;
  branding: number;
  innovation: number;
  training: number;
  safety: number;
  insurance: number;
}

const MARKETING_MAX_DEMAND_BONUS = 0.5;
/** Marketing : plus de demande (volume de clientèle touchée). */
export function computeMarketingDemandMultiplier(level: number): number {
  return 1 + (level / 100) * MARKETING_MAX_DEMAND_BONUS;
}

/**
 * Qualité/R&D : des intrants et un procédé plus soignés coûtent plus cher à
 * produire — un vrai compromis, compensé par computeQualityPriceTolerance
 * (le marché accepte de payer plus cher) plutôt qu'un simple bonus gratuit.
 */
export function computeQualityUnitCostMultiplier(level: number): number {
  return 1 + (level / 100) * QUALITY_MAX_UNIT_COST_INCREASE;
}

/** Qualité/R&D : le marché tolère un prix de référence plus élevé sans perdre de demande. */
export function computeQualityPriceTolerance(level: number): number {
  return 1 + (level / 100) * QUALITY_MAX_PRICE_TOLERANCE;
}

const EQUIPMENT_MAX_CAPACITY_BONUS = 0.3;
/** Équipement : plus de capacité de production (unités/cycle). */
export function computeEquipmentCapacityMultiplier(level: number): number {
  return 1 + (level / 100) * EQUIPMENT_MAX_CAPACITY_BONUS;
}

// Idem : calibré pour un cycle hebdomadaire, divisé par 7.
const WORK_CONDITIONS_MAX_REPUTATION_TRICKLE = 0.0714;
/** Conditions de travail : petit gain de réputation passif pour le dirigeant, indépendant des événements. */
export function computeWorkConditionsReputationTrickle(level: number): number {
  return (level / 100) * WORK_CONDITIONS_MAX_REPUTATION_TRICKLE;
}

/** Automatisation : des machines remplacent le travail manuel répétitif → coût de production par unité réduit. */
export function computeAutomationUnitCostMultiplier(level: number): number {
  return 1 - (level / 100) * AUTOMATION_MAX_UNIT_COST_REDUCTION;
}

/** Coût de production d'une unité, avant vente : matières/process de base, modulé par automatisation et qualité. */
export function computeUnitCost(automationLevel: number, qualityLevel: number): number {
  return BASE_UNIT_COST * computeAutomationUnitCostMultiplier(automationLevel) * computeQualityUnitCostMultiplier(qualityLevel);
}

/** Coût de production d'une unité pour une gamme donnée — chaque gamme a sa propre économie (cf. domain PRODUCT_CATALOG). */
export function computeProductUnitCost(automationLevel: number, qualityLevel: number, productType: ProductType): number {
  return computeUnitCost(automationLevel, qualityLevel) * PRODUCT_CATALOG[productType].unitCostMultiplier;
}

export interface CompanyBalanceSheetSource {
  cashReserve: { toNumber(): number };
  equipmentInvestment: { toNumber(): number };
  equipmentAccumulatedDepreciation: { toNumber(): number };
  marketingInvestment: { toNumber(): number };
  rdInvestment: { toNumber(): number };
  workConditionsInvestment: { toNumber(): number };
  automationInvestment: { toNumber(): number };
  brandingInvestment: { toNumber(): number };
  innovationInvestment: { toNumber(): number };
  trainingInvestment: { toNumber(): number };
  safetyInvestment: { toNumber(): number };
  insuranceInvestment: { toNumber(): number };
  loans: { status: string; remainingBalance: { toNumber(): number } }[];
  products: { type: string; stockUnits: { toNumber(): number } }[];
  /** Prêts communautaires accordés par l'entreprise, encore actifs (cf. domain/community-lending.ts) — une créance. */
  loansAsLender?: { status: string; remainingBalance: { toNumber(): number } }[];
  /** Réserve de liquidation (cf. domain/dividends.ts). */
  liquidationReserve: { toNumber(): number };
  /** Dépôts de joueurs encore actifs (cf. domain/banking.ts) — une dette, l'argent est dû aux déposants. */
  deposits?: { withdrawnCycle: number | null; balance: { toNumber(): number } }[];
}

/**
 * Bilan simplifié assemblé à partir des colonnes brutes d'une entreprise —
 * partagé entre l'API (vue détaillée d'entreprise) et la clôture de cycle
 * (calcul du patrimoine total des joueurs, cf. cycles.ts) pour ne pas
 * dupliquer la logique d'assemblage (cf. finance.ts, computeCompanyBalanceSheet).
 */
export function assembleCompanyBalanceSheet(company: CompanyBalanceSheetSource): CompanyBalanceSheet {
  const equipmentBookValue = computeEquipmentBookValue(
    company.equipmentInvestment.toNumber(),
    company.equipmentAccumulatedDepreciation.toNumber(),
  );
  const otherInvestmentsCumulative =
    company.marketingInvestment.toNumber() +
    company.rdInvestment.toNumber() +
    company.workConditionsInvestment.toNumber() +
    company.automationInvestment.toNumber() +
    company.brandingInvestment.toNumber() +
    company.innovationInvestment.toNumber() +
    company.trainingInvestment.toNumber() +
    company.safetyInvestment.toNumber() +
    company.insuranceInvestment.toNumber();

  const automationLevel = computeInvestmentLevel(company.automationInvestment.toNumber());
  const qualityLevel = computeInvestmentLevel(company.rdInvestment.toNumber());
  const inventoryValue = company.products.reduce((sum, product) => {
    const unitCost = computeProductUnitCost(automationLevel, qualityLevel, product.type as ProductType);
    return sum + product.stockUnits.toNumber() * unitCost;
  }, 0);

  const totalDebt = company.loans
    .filter((l) => l.status === "ACTIVE")
    .reduce((sum, l) => sum + l.remainingBalance.toNumber(), 0);

  const loansReceivable = (company.loansAsLender ?? [])
    .filter((l) => l.status === "ACTIVE")
    .reduce((sum, l) => sum + l.remainingBalance.toNumber(), 0);

  const depositsOwed = (company.deposits ?? [])
    .filter((d) => d.withdrawnCycle === null)
    .reduce((sum, d) => sum + d.balance.toNumber(), 0);

  return computeCompanyBalanceSheet({
    cashReserve: company.cashReserve.toNumber(),
    equipmentBookValue,
    otherInvestmentsCumulative,
    inventoryValue,
    totalDebt: totalDebt + depositsOwed,
    loansReceivable,
    liquidationReserve: company.liquidationReserve.toNumber(),
  });
}

const INSURANCE_MAX_LOSS_RATIO_BASE = 0.3;
const INSURANCE_MAX_LOSS_RATIO_FLOOR = 0.1;
/** Assurance : plafonne la perte maximale qu'un seul événement négatif peut infliger, en plus de la réserve. */
export function computeInsuranceMaxLossRatio(level: number): number {
  return (
    INSURANCE_MAX_LOSS_RATIO_BASE -
    (level / 100) * (INSURANCE_MAX_LOSS_RATIO_BASE - INSURANCE_MAX_LOSS_RATIO_FLOOR)
  );
}

// --- Employés NPC & organisation --------------------------------------------

const EMPLOYEE_MIN_EFFICIENCY = 0.5;
const EMPLOYEE_MAX_EFFICIENCY = 1.5;

/**
 * Le moral d'un département (0-100, vivant — cf. domain/organization.ts,
 * computeDepartmentMoraleBaseline/Drift) pilote directement l'efficacité de
 * ses employés : une équipe démoralisée ne produit qu'à moitié de son
 * potentiel, une équipe épanouie jusqu'à 1,5×. Remplace l'ancienne
 * efficacité globale basée sur le seul niveau d'investissement
 * "conditions de travail" (qui reste la base vers laquelle le moral dérive,
 * cf. computeDepartmentMoraleBaseline, mais le moral peut s'en écarter).
 */
export function computeDepartmentEfficiency(morale: number): number {
  return EMPLOYEE_MIN_EFFICIENCY + (morale / 100) * (EMPLOYEE_MAX_EFFICIENCY - EMPLOYEE_MIN_EFFICIENCY);
}

/**
 * Base vers laquelle le moral d'un département dérive — financée par le
 * levier "conditions de travail" (30 à 70 selon son niveau), amputée si le
 * département n'a pas de responsable dédié pour porter les problèmes
 * d'équipe (cf. domain/organization.ts).
 */
export function computeDepartmentMoraleBaseline(workConditionsLevel: number, hasManager: boolean): number {
  const base = MORALE_BASELINE_MIN + (workConditionsLevel / 100) * (MORALE_BASELINE_MAX - MORALE_BASELINE_MIN);
  return Math.max(0, base - (hasManager ? 0 : MORALE_UNMANAGED_PENALTY));
}

/**
 * Le moral d'un cycle à l'autre : dérive vers sa base (jamais instantané),
 * secoué d'un peu d'aléa pour rester vivant plutôt que figé sur une pure
 * formule.
 */
export function computeDepartmentMoraleDrift(currentMorale: number, baseline: number): number {
  const drifted = currentMorale + (baseline - currentMorale) * MORALE_DRIFT_RATE;
  const randomWalk = (Math.random() * 2 - 1) * MORALE_RANDOM_WALK_RANGE;
  return Math.min(100, Math.max(0, drifted + randomWalk));
}

export interface EmployeeCountsByTier {
  unskilled: number;
  qualified: number;
  specialist: number;
}

export interface DepartmentEmployeeCounts {
  morale: number;
  counts: EmployeeCountsByTier;
}

const MAX_TRAINING_BOOST = 0.5;

/**
 * Contribution brute d'un département : somme de son effectif pondérée par
 * la contribution de base de chaque palier (cf. domain EMPLOYEE_TIER_CATALOG),
 * modulée par le moral de CE département (cf. computeDepartmentEfficiency).
 * Brique commune aux 4 effets distincts par département (production,
 * computeSalesCompetitivenessMultiplier, computeRdStaffInnovationBonus,
 * computeHrStaffMoraleBonus) — seule la conversion de cette contribution en
 * effet final diffère selon le département.
 */
export function computeDepartmentContribution(counts: EmployeeCountsByTier, morale: number): number {
  const efficiency = computeDepartmentEfficiency(morale);
  const rawContribution = EMPLOYEE_TIERS.reduce(
    (s, tier) => s + counts[tier] * EMPLOYEE_TIER_CATALOG[tier].baseContribution,
    0,
  );
  return rawContribution * efficiency;
}

/**
 * Production : la contribution du département production, modulée par la
 * formation (compétence de l'effectif déjà en poste — une alternative à
 * l'embauche plutôt qu'un doublon de l'efficacité), devient un multiplicateur
 * de capacité.
 */
export function computeEmployeeCapacityMultiplier(
  productionDepartment: DepartmentEmployeeCounts,
  trainingLevel: number,
): number {
  const trainingMultiplier = 1 + (trainingLevel / 100) * MAX_TRAINING_BOOST;
  const contribution = computeDepartmentContribution(productionDepartment.counts, productionDepartment.morale);
  return 1 + contribution * trainingMultiplier;
}

/**
 * Ventes : multiplicateur de compétitivité — une équipe commerciale vend
 * mieux ce que l'entreprise produit déjà, distinct du levier marketing (qui,
 * lui, attire de la demande) — cf. domain/organization.ts.
 */
export function computeSalesCompetitivenessMultiplier(salesContribution: number): number {
  return 1 + Math.min(MAX_SALES_COMPETITIVENESS_BONUS, salesContribution);
}

/**
 * R&D : bonus de points de niveau d'innovation apporté par l'équipe, en plus
 * de l'investissement en argent (cf. domain/organization.ts) — débloque les
 * gammes plus vite.
 */
export function computeRdStaffInnovationBonus(rdContribution: number): number {
  return Math.min(MAX_RD_STAFF_INNOVATION_BONUS, rdContribution * RD_STAFF_INNOVATION_SCALE);
}

/**
 * RH : bonus de base de moral apporté à TOUS les départements, pas seulement
 * le sien (cf. domain/organization.ts) — le rôle réel d'une équipe RH.
 */
export function computeHrStaffMoraleBonus(hrContribution: number): number {
  return Math.min(MAX_HR_STAFF_MORALE_BONUS, hrContribution * HR_STAFF_MORALE_SCALE);
}

export function totalEmployeeCount(counts: EmployeeCountsByTier): number {
  return counts.unskilled + counts.qualified + counts.specialist;
}

export function computeEmployeeSalaryCosts(counts: EmployeeCountsByTier): number {
  return EMPLOYEE_TIERS.reduce((sum, tier) => sum + counts[tier] * EMPLOYEE_TIER_CATALOG[tier].salaryPerCycle, 0);
}

// --- Production, demande et vente ------------------------------------------

/**
 * Capacité de production (unités/cycle) : un fondateur seul peut déjà
 * produire un peu (BASE_CAPACITY_NO_EMPLOYEES), l'effectif la multiplie
 * (cf. computeEmployeeCapacityMultiplier, moral par département), l'équipement
 * aussi. Le multiplicateur d'attention (plusieurs entreprises sans manager)
 * s'applique séparément, au niveau de runProductionCycle.
 */
export function computeProductionCapacity(
  productionDepartment: DepartmentEmployeeCounts,
  equipmentLevel: number,
  trainingLevel: number,
): number {
  const employeeMultiplier = computeEmployeeCapacityMultiplier(productionDepartment, trainingLevel);
  const equipmentMultiplier = computeEquipmentCapacityMultiplier(equipmentLevel);
  return BASE_CAPACITY_NO_EMPLOYEES * employeeMultiplier * equipmentMultiplier;
}

export interface CompetitivenessInputs {
  effectiveAttractiveness: number;
  marketingLevel: number;
  qualityLevel: number;
  brandingLevel: number;
  innovationLevel: number;
  unitPrice: number;
  productType: ProductType;
}

/**
 * Force commerciale relative d'une entreprise sur le marché (secteur, gamme
 * de produit) — PAS une quantité de demande captée en soi, juste un poids
 * comparé à celui des autres participants du même marché (cf.
 * computeMarketPoolSize / computeCapturedDemand). Proportionnelle à
 * l'attractivité et au marketing, sensible au prix demandé par rapport à un
 * prix de référence propre à la gamme, que la qualité peut relever (les
 * clients tolèrent plus cher pour du bon produit) et que le branding rend
 * moins déterminant (fidélité de marque — élasticité-prix réduite).
 * Certaines gammes (innovationDemandSensitivity > 0) continuent en plus de
 * profiter directement de chaque palier de R&D après leur déblocage. Un prix
 * cassé peut au mieux tripler la compétitivité de référence
 * (DEMAND_PRICE_MULTIPLIER_CAP), pas la rendre infinie.
 */
export function computeCompetitiveness(inputs: CompetitivenessInputs): number {
  const { effectiveAttractiveness, marketingLevel, qualityLevel, brandingLevel, innovationLevel, unitPrice, productType } =
    inputs;
  const catalog = PRODUCT_CATALOG[productType];

  const attractivenessRatio = effectiveAttractiveness / REFERENCE_ATTRACTIVENESS;
  const marketingMultiplier = computeMarketingDemandMultiplier(marketingLevel);
  const innovationMultiplier = 1 + (innovationLevel / 100) * catalog.innovationDemandSensitivity;
  const acceptedReferencePrice =
    REFERENCE_UNIT_PRICE * catalog.referencePriceMultiplier * computeQualityPriceTolerance(qualityLevel);
  const elasticity = PRICE_ELASTICITY_BASE * (1 - (brandingLevel / 100) * BRANDING_MAX_ELASTICITY_REDUCTION);
  const priceMultiplier = Math.min(
    DEMAND_PRICE_MULTIPLIER_CAP,
    Math.pow(acceptedReferencePrice / Math.max(0.01, unitPrice), elasticity),
  );

  return Math.max(0, attractivenessRatio * marketingMultiplier * innovationMultiplier * priceMultiplier);
}

/**
 * Taille du marché (unités/cycle) pour un (secteur, gamme de produit) —
 * le "gâteau" total que toutes les entreprises actives sur ce marché (cf.
 * computeCapturedDemand) se partagent proportionnellement à leur
 * compétitivité. Pour "core", inclut la compétitivité cumulée des
 * concurrents IA du secteur (cf. SectorCompetitor) + une référence d'une
 * entreprise joueur ; les autres gammes n'ont pas de concurrents IA (l'IA ne
 * fait pas de R&D), leur référence est celle d'une seule entreprise joueur —
 * un pionnier isolé en profite pleinement, plusieurs joueurs sur la même
 * gamme se la partagent réellement.
 */
/**
 * Facteur de croissance de la demande, appliqué à TOUS les marchés (cf.
 * computeMarketPoolSize) — un seul indice d'activité économique global,
 * alimenté par deux leviers cumulables (cf. domain/market.ts) : le nombre de
 * joueurs inscrits, et l'investissement communal cumulé en infrastructure
 * (converti en "joueurs-équivalents"). Rendements décroissants (racine
 * carrée), comme le reste du jeu.
 */
export function computeDemandGrowthMultiplier(activePlayerCount: number, totalInfrastructureFund: number): number {
  const economicActivityIndex = Math.max(0, activePlayerCount) + Math.max(0, totalInfrastructureFund) / INFRASTRUCTURE_ECONOMIC_ACTIVITY_CONVERSION;
  return 1 + Math.sqrt(economicActivityIndex / POPULATION_DEMAND_SCALE);
}

export function computeMarketPoolSize(productType: ProductType, npcCompetitivenessSum: number): number {
  const referenceSize =
    productType === "core" ? npcCompetitivenessSum + CORE_MARKET_NPC_REFERENCE_OFFSET : NON_CORE_MARKET_REFERENCE_SIZE;
  return BASE_DEMAND_UNITS * PRODUCT_CATALOG[productType].demandMultiplier * referenceSize;
}

/**
 * Bonus multiplicatif de taille de marché issu de l'investissement marketing
 * COLLECTIF de toutes les entreprises actives sur ce (secteur, gamme) — cf.
 * domain/market.ts MARKET_DEVELOPMENT_SCALE. Contrairement à la compétitivité
 * (qui ne change que la part captée), ceci fait grossir le gâteau lui-même.
 */
export function computeMarketDevelopmentBonus(marketingLevelSum: number): number {
  return Math.min(MAX_MARKET_DEVELOPMENT_BONUS, Math.sqrt(Math.max(0, marketingLevelSum) / MARKET_DEVELOPMENT_SCALE));
}

/** Part du marché captée par une entreprise, proportionnelle à sa compétitivité relative dans ce (secteur, gamme). */
export function computeCapturedDemand(poolSize: number, ownCompetitiveness: number, totalCompetitiveness: number): number {
  if (totalCompetitiveness <= 0) return 0;
  return poolSize * (ownCompetitiveness / totalCompetitiveness);
}

/** Part de marché en %, pour affichage — même ratio que computeCapturedDemand, exprimé en pourcentage. */
export function computeMarketSharePercent(ownCompetitiveness: number, totalCompetitiveness: number): number {
  if (totalCompetitiveness <= 0) return 0;
  return (ownCompetitiveness / totalCompetitiveness) * 100;
}

export interface ProductLineInputs {
  capacity: number;
  demand: number;
  unitPrice: number;
  unitCost: number;
  stockUnitsBefore: number;
}

export interface ProductLineResult {
  unitsProduced: number;
  unitsSold: number;
  unitsLostDemand: number;
  stockUnitsAfter: number;
  stockWasted: number;
  revenue: number;
  variableCosts: number;
  holdingCosts: number;
}

/**
 * Chaîne production → demande → vente d'un cycle pour UNE gamme de produit,
 * une fois sa capacité (part de la capacité totale de l'entreprise, cf.
 * computeProductionCapacity) et sa demande déjà déterminées par l'appelant.
 * La gamme produit toujours à pleine capacité allouée (pas de réglage fin de
 * la quantité) ; l'excédent non vendu part en stock plutôt que d'être perdu,
 * plafonné à MAX_STOCK_CYCLES fois la capacité d'un cycle avant péremption —
 * surproduire durablement par rapport à la demande immobilise du capital
 * (coût de stockage) plutôt que de rapporter, ce qui pousse à équilibrer
 * capacité et demande (marketing, prix, allocation entre gammes) plutôt qu'à
 * empiler indéfiniment équipement et employés.
 */
export function runProductLine(inputs: ProductLineInputs): ProductLineResult {
  const { capacity, demand, unitPrice, unitCost, stockUnitsBefore } = inputs;

  const unitsProduced = capacity;
  const availableUnits = unitsProduced + stockUnitsBefore;
  const unitsSold = Math.min(availableUnits, demand);
  const unitsLostDemand = Math.max(0, demand - availableUnits);

  const unsoldUnits = availableUnits - unitsSold;
  const maxStock = capacity * MAX_STOCK_CYCLES;
  const stockUnitsAfter = Math.min(unsoldUnits, maxStock);
  const stockWasted = Math.max(0, unsoldUnits - maxStock);

  return {
    unitsProduced,
    unitsSold,
    unitsLostDemand,
    stockUnitsAfter,
    stockWasted,
    revenue: unitsSold * unitPrice,
    variableCosts: unitsProduced * unitCost,
    holdingCosts: stockUnitsAfter * STOCK_HOLDING_COST_PER_UNIT,
  };
}

// --- Événements aléatoires par entreprise ---------------------------------

type CompanyEventAxis = "marketing" | "quality" | "equipment" | "workConditions" | "employees";

interface CompanyEventDefinition {
  axis: CompanyEventAxis;
  positiveLabel: string;
  negativeLabel: string;
}

/**
 * Un type d'événement par levier (hors réserve, qui joue un rôle
 * transversal d'amortisseur plutôt que déclencheur). L'ampleur de l'effet
 * est modulée par le niveau déjà investi dans l'axe concerné : un
 * événement positif est amplifié par l'investissement existant (il
 * récompense un choix déjà fait), un événement négatif est amorti par lui
 * (il protège) — jamais totalement annulé. L'événement "employees" n'est
 * tiré que si l'entreprise a au moins un employé, et son amplitude dépend
 * elle aussi des conditions de travail (mêmes causes, mêmes effets qu'un
 * conflit social).
 */
const EVENT_DEFINITIONS: CompanyEventDefinition[] = [
  { axis: "marketing", positiveLabel: "Campagne devenue virale", negativeLabel: "Bad buzz sur les réseaux" },
  { axis: "quality", positiveLabel: "Récompense qualité obtenue", negativeLabel: "Scandale de qualité révélé" },
  { axis: "equipment", positiveLabel: "Gain de productivité inattendu", negativeLabel: "Panne d'équipement majeure" },
  {
    axis: "workConditions",
    positiveLabel: "Conditions de travail saluées publiquement",
    negativeLabel: "Conflit social médiatisé",
  },
  {
    axis: "employees",
    positiveLabel: "Un employé s'est révélé exceptionnel",
    negativeLabel: "Accident du travail / employé malade",
  },
];

// Calibré à l'origine pour un cycle hebdomadaire (8%/cycle), divisé par 7
// pour un cycle quotidien afin de garder la même fréquence réelle.
const EVENT_PROBABILITY_PER_CYCLE = 0.0114;
const EVENT_BASE_MAGNITUDE_MIN = 0.1;
const EVENT_BASE_MAGNITUDE_RANGE = 0.2;
const NEGATIVE_EVENT_MAX_DAMPENING = 0.7;
const RESERVE_ABSORPTION_SHARE = 0.5;
const MAX_BRANDING_DAMPENING = 0.3;
const MAX_INNOVATION_BOOST = 0.3;

export interface CompanyEventResult {
  label: string;
  isPositive: boolean;
  /** Montant en euros à ajouter (positif) ou retrancher (négatif) au revenu du cycle — déjà net de l'amortissement par la réserve. */
  revenueDelta: number;
  /** Effet direct sur la réputation du propriétaire (événements "conditions de travail" uniquement). */
  reputationDelta: number;
  /** Montant prélevé sur la réserve de trésorerie pour amortir une perte. */
  reserveConsumed: number;
}

/**
 * Tire un événement aléatoire pour une entreprise à la clôture d'un cycle.
 * `baseRevenue` sert de référence pour chiffrer l'impact ; `reserveBalance`
 * plafonne ce que la réserve peut absorber ; `employeeCount` détermine si
 * un événement "employés" peut être tiré.
 */
export function rollCompanyEvent(
  baseRevenue: number,
  levels: CompanyInvestmentLevels,
  reserveBalance: number,
  employeeCount: number,
): CompanyEventResult | null {
  if (Math.random() > EVENT_PROBABILITY_PER_CYCLE) return null;

  const eligibleDefinitions = EVENT_DEFINITIONS.filter((def) => def.axis !== "employees" || employeeCount > 0);
  const definition = eligibleDefinitions[Math.floor(Math.random() * eligibleDefinitions.length)];
  const isPositive = Math.random() < 0.5;
  const label = isPositive ? definition.positiveLabel : definition.negativeLabel;

  if (definition.axis === "workConditions") {
    const level = levels.workConditions;
    const reputationDelta = isPositive ? 3 + (level / 100) * 5 : -(5 - (level / 100) * 4);
    return { label, isPositive, revenueDelta: 0, reputationDelta, reserveConsumed: 0 };
  }

  // Pour "employees" : la mise en valeur d'un employé exceptionnel vient de
  // la formation, la protection contre l'accident vient de la sécurité —
  // deux leviers RH désormais distincts des conditions de travail (qui
  // restent liées au moral/à la réputation, pas à la compétence ou au
  // risque physique).
  const relevantLevel =
    definition.axis === "employees" ? (isPositive ? levels.training : levels.safety) : levels[definition.axis];

  const baseMagnitude = EVENT_BASE_MAGNITUDE_MIN + Math.random() * EVENT_BASE_MAGNITUDE_RANGE;

  if (isPositive) {
    const innovationBoost = 1 + (levels.innovation / 100) * MAX_INNOVATION_BOOST;
    const magnitude = baseMagnitude * (1 + relevantLevel / 100) * innovationBoost;
    return { label, isPositive, revenueDelta: baseRevenue * magnitude, reputationDelta: 0, reserveConsumed: 0 };
  }

  const brandingDampening = 1 - (levels.branding / 100) * MAX_BRANDING_DAMPENING;
  const magnitude = baseMagnitude * (1 - (relevantLevel / 100) * NEGATIVE_EVENT_MAX_DAMPENING) * brandingDampening;
  const rawLoss = baseRevenue * magnitude;
  const insuranceCap = baseRevenue * computeInsuranceMaxLossRatio(levels.insurance);
  const cappedLoss = Math.min(rawLoss, insuranceCap);
  const reserveConsumed = Math.min(reserveBalance, cappedLoss * RESERVE_ABSORPTION_SHARE);
  const netLoss = cappedLoss - reserveConsumed;

  return { label, isPositive, revenueDelta: -netLoss, reputationDelta: 0, reserveConsumed };
}
