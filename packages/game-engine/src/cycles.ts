import type { PrismaClient } from "@patrimoine-jeu/db";
import {
  ACHIEVEMENT_CATALOG,
  AUCTION_WINNER_DEFAULT_REPUTATION_PENALTY,
  BANK_INSOLVENCY_EQUITY_RATIO_THRESHOLD,
  COMMODITY_POOL_PER_PLAYER,
  COMMUNITY_LOAN_DEFAULT_REPUTATION_PENALTY,
  COMPANY_PROFIT_MILESTONES,
  COMPANY_BANKRUPTCY_REPUTATION_PENALTY,
  CYCLES_PER_YEAR,
  getCareerTier,
  INVESTMENT_LEVEL_MILESTONES,
  NET_WORTH_MILESTONES,
  DEPARTMENTS,
  FINANCIAL_ASSET_CATALOG,
  FINANCIAL_ASSET_SECTORAL_DRIFT_SENSITIVITY,
  GUILD_FINE_PER_MEMBER,
  GUILD_REPUTATION_PENALTY,
  DEPARTMENT_MANAGER_SALARY_PER_CYCLE,
  EMPLOYEE_TIERS,
  FORECLOSURE_REPUTATION_PENALTY,
  FORECLOSURE_SALE_RATIO,
  LOAN_DEFAULT_ATTRACTIVENESS_PENALTY,
  MANAGER_SALARY_PER_CYCLE,
  NON_CORE_REFERENCE_COMPETITIVENESS,
  NPC_JOBS,
  PERSONAL_GOOD_CATALOG,
  PROVINCE_SECTOR_AFFINITIES,
  PROPERTY_TYPE_RANGES,
  PROVINCE_PROPERTY_PROFILES,
  PROVINCE_SECTOR_AFFINITY_BONUS,
  REFERENCE_UNIT_PRICE,
  type ProvincePropertyType,
  RESIDENTIAL_PROPERTY_TYPES,
  SAVINGS_PRODUCT_LABELS,
  type AchievementMilestone,
  type Department,
  type EmployeeTier,
  type InvestmentAxis,
  type JobId,
  type PersonalGoodId,
  type ProductType,
  type SavingsProductType,
} from "@patrimoine-jeu/domain";
import {
  applySocialContributions,
  calculateIpp,
  calculateIsoc,
  calculateNetAnnualIncome,
  calculateSelfEmployedContributions,
  type IppRuleSet,
  type IsocRuleSet,
  type TaxBracket,
} from "@patrimoine-jeu/fiscal-be";
import {
  assembleCompanyBalanceSheet,
  computeAttentionMultiplier,
  computeCapturedDemand,
  computeCompetitiveness,
  computeDemandGrowthMultiplier,
  computeDepartmentContribution,
  computeDepartmentMoraleBaseline,
  computeDepartmentMoraleDrift,
  computeEffectiveAttractiveness,
  computeEmployeeSalaryCosts,
  computeHrStaffMoraleBonus,
  computeEffectiveInvestmentLevel,
  computeValorizationMultiplier,
  computeMarketDevelopmentBonus,
  computeMarketPoolSize,
  computeMarketSharePercent,
  computeProductionCapacity,
  computeProductUnitCost,
  computeRdStaffInnovationBonus,
  computeSalesCompetitivenessMultiplier,
  computeWorkConditionsReputationTrickle,
  isCompanyBankrupt,
  rollCompanyEvent,
  runProductLine,
  totalEmployeeCount,
  type DepartmentEmployeeCounts,
  type EmployeeCountsByTier,
} from "./companies.js";
import { computeCommodityPoolGrowth, computeSpotPrice } from "./commodities.js";
import {
  computeEquipmentBookValue,
  computeEquipmentDepreciation,
  computeLoanCyclePayment,
} from "./finance.js";
import { computeCollectedRent, computePropertyConditionDecay, computeRegistrationDuty } from "./property.js";
import { computePersonalInvestmentLevel } from "./personal.js";
import { computeSavingsInterest } from "./savings.js";
import { computePersonalGoodValue } from "./personal-goods.js";
import { rollPersonalLifeEvent } from "./personal-events.js";
import { computeAuctionState, type AuctionBidInput } from "./property-auction.js";
import { matchB2bSupply, type B2bBuyer, type B2bSeller } from "./supply-chain.js";
import { computeAssetDividend, computeNextAssetPrice } from "./financial-assets.js";
import { computeBankDepositInterest } from "./banking.js";
import { rollGuildDetection } from "./guild.js";
import { computeDividendDistribution, computeLiquidationReserveEntry } from "./dividends.js";
import { computeSectoralDemandMultiplier, rollSectoralEvent, type ActiveSectoralEffect } from "./sectoral-events.js";
import { computeInfrastructureAttractivenessBonus, computeLocalInfrastructureDemandBonus } from "./municipality.js";
import {
  clampStat,
  computeBaselineWellbeingRegen,
  computeIndependentActivityWellbeingDrain,
  computePressureDrain,
  computeUnmanagedCompanyWellbeingDrain,
  computeWellbeingIncomeMultiplier,
} from "./wellbeing.js";

/**
 * Additionnel communal moyen appliqué aux emplois NPC, en attendant qu'un
 * joueur puisse choisir sa commune de résidence (cf. seed.ts pour les taux
 * réels par commune, section 7 du document de conception).
 */
const DEFAULT_COMMUNAL_SURCHARGE_RATE = 0.075;

/** Réinvestissement automatique (cf. domain/default-rules.ts) — même mapping axe→colonne que companies.service.ts invest(). */
const AUTO_REINVEST_FIELD_BY_AXIS: Record<
  InvestmentAxis,
  | "marketingInvestment"
  | "rdInvestment"
  | "equipmentInvestment"
  | "workConditionsInvestment"
  | "cashReserve"
  | "automationInvestment"
  | "brandingInvestment"
  | "innovationInvestment"
  | "trainingInvestment"
  | "safetyInvestment"
  | "insuranceInvestment"
> = {
  marketing: "marketingInvestment",
  quality: "rdInvestment",
  equipment: "equipmentInvestment",
  workConditions: "workConditionsInvestment",
  reserve: "cashReserve",
  automation: "automationInvestment",
  branding: "brandingInvestment",
  innovation: "innovationInvestment",
  training: "trainingInvestment",
  safety: "safetyInvestment",
  insurance: "insuranceInvestment",
};

export async function getOrCreateOpenCycle(prisma: PrismaClient) {
  const open = await prisma.cycle.findFirst({ where: { status: "OPEN" } });
  if (open) return open;

  return prisma.cycle.create({ data: { number: 1, status: "OPEN" } });
}

async function getLatestTaxRuleSet(prisma: PrismaClient) {
  const ruleSet = await prisma.taxRuleSet.findFirst({ orderBy: { effectiveFrom: "desc" } });

  if (!ruleSet) {
    throw new Error("Aucun TaxRuleSet en base — as-tu lancé `pnpm db:seed` ?");
  }

  const ipp: IppRuleSet = {
    effectiveFrom: ruleSet.effectiveFrom.toISOString(),
    taxFreeAllowance: ruleSet.taxFreeAllowance.toNumber(),
    brackets: ruleSet.ippBrackets as unknown as TaxBracket[],
    socialContributionRate: ruleSet.socialContributionRateEmployee.toNumber(),
  };

  const isoc: IsocRuleSet = {
    isocRate: ruleSet.isocRate.toNumber(),
    isocReducedRate: ruleSet.isocReducedRate.toNumber(),
    isocReducedThreshold: ruleSet.isocReducedThreshold.toNumber(),
  };

  const capitalGains = {
    rate: ruleSet.capitalGainsRate.toNumber(),
    exemption: ruleSet.capitalGainsExemption.toNumber(),
  };

  const pensionSavings = {
    taxReductionRate: ruleSet.pensionSavingsTaxReductionRate.toNumber(),
    annualCap: ruleSet.pensionSavingsAnnualCap.toNumber(),
  };

  const selfEmployed = {
    brackets: ruleSet.selfEmployedBrackets as unknown as TaxBracket[],
    minimumQuarterly: ruleSet.selfEmployedMinimumQuarterly.toNumber(),
  };

  return { ipp, isoc, capitalGains, pensionSavings, selfEmployed };
}

export async function getPensionSavingsRules(prisma: PrismaClient) {
  const { pensionSavings } = await getLatestTaxRuleSet(prisma);
  return pensionSavings;
}

export async function getCapitalGainsRules(prisma: PrismaClient) {
  const { capitalGains } = await getLatestTaxRuleSet(prisma);
  return capitalGains;
}

/**
 * Règle toute enchère immobilière expirée (en temps réel, indépendamment du
 * cycle de jeu — cf. domain/property-auction.ts) : transfère le bien au
 * meneur au prix calculé (proxy bidding, cf. computeAuctionState). Si le
 * meneur ne peut plus payer (fonds dépensés entretemps), il écope d'une
 * pénalité de réputation et on retombe sur l'enchérisseur suivant. Sans
 * aucun enchérisseur solvable, le bien redevient simplement disponible.
 * Traité AVANT le reste de la clôture (transaction séparée) pour que le
 * patrimoine liquide déjà à jour soit vu par la boucle joueurs qui suit.
 */
async function settleExpiredAuctions(prisma: PrismaClient, currentCycleNumber: number) {
  const expiredAuctions = await prisma.listing.findMany({
    where: { isAuction: true, expiresAt: { lte: new Date() } },
    include: { bids: true, property: { include: { municipality: true } } },
  });

  for (const listing of expiredAuctions) {
    await prisma.$transaction(async (tx) => {
      let remainingBids: AuctionBidInput[] = listing.bids.map((bid) => ({
        playerId: bid.playerId,
        maxAmount: (bid.maxProxyAmount ?? bid.amount).toNumber(),
      }));

      // Chaque itération règle le meneur courant ou l'écarte (défaut) — la
      // liste se réduit strictement d'un enchérisseur à chaque passage,
      // donc la boucle termine forcément (au pire quand plus personne n'est
      // solvable, cf. la branche !state.leaderId ci-dessous).
      while (true) {
        const state = computeAuctionState(listing.price.toNumber(), remainingBids);

        if (!state.leaderId) {
          await tx.property.update({ where: { id: listing.propertyId }, data: { status: "OWNED" } });
          if (listing.property.ownerId) {
            await tx.playerNotification.create({
              data: {
                playerId: listing.property.ownerId,
                type: "auction-no-bid",
                message: `Ton enchère pour un bien (${listing.property.type.toLowerCase()}) s'est terminée sans acheteur.`,
                cycle: currentCycleNumber,
              },
            });
          }
          break;
        }

        const [winnerStats, winnerOwnsResidentialCount] = await Promise.all([
          tx.playerStats.findUnique({ where: { playerId: state.leaderId } }),
          tx.property.count({
            where: { ownerId: state.leaderId, type: { in: [...RESIDENTIAL_PROPERTY_TYPES] } },
          }),
        ]);
        const duty = computeRegistrationDuty(
          state.currentPrice,
          listing.property.type,
          listing.property.municipality.registrationDutyRate.toNumber(),
          listing.property.municipality.registrationDutyRateOwnHome.toNumber(),
          winnerOwnsResidentialCount > 0,
        );
        const totalCost = state.currentPrice + duty.amount;
        const canAfford = winnerStats && winnerStats.wealthLiquid.toNumber() >= totalCost;

        if (canAfford) {
          await tx.property.update({
            where: { id: listing.propertyId },
            data: { ownerId: state.leaderId, status: "OWNED" },
          });
          await tx.playerStats.update({
            where: { playerId: state.leaderId },
            data: { wealthLiquid: { decrement: totalCost } },
          });
          if (listing.property.ownerId) {
            await tx.playerStats.update({
              where: { playerId: listing.property.ownerId },
              data: { wealthLiquid: { increment: state.currentPrice } },
            });
            await tx.playerNotification.create({
              data: {
                playerId: listing.property.ownerId,
                type: "property-sold",
                message: `Ton bien (${listing.property.type.toLowerCase()}) a été vendu aux enchères pour ${state.currentPrice.toFixed(0)} €.`,
                cycle: currentCycleNumber,
              },
            });
          }
          await tx.playerNotification.create({
            data: {
              playerId: state.leaderId,
              type: "auction-won",
              message: `Tu as remporté l'enchère pour ${state.currentPrice.toFixed(0)} € (+ ${duty.amount.toFixed(0)} € de droits d'enregistrement).`,
              cycle: currentCycleNumber,
            },
          });
          await tx.pressArticle.create({
            data: {
              category: "AUCTION_WON",
              headline: `Enchère immobilière remportée pour un bien (${listing.property.type.toLowerCase()}) à ${state.currentPrice.toFixed(0)} €.`,
              cycle: currentCycleNumber,
            },
          });
          break;
        }

        if (winnerStats) {
          await tx.playerStats.update({
            where: { playerId: state.leaderId },
            data: { reputation: clampStat(winnerStats.reputation.toNumber() - AUCTION_WINNER_DEFAULT_REPUTATION_PENALTY) },
          });
          await tx.playerNotification.create({
            data: {
              playerId: state.leaderId,
              type: "auction-default",
              message: `Tu n'as pas pu honorer ton enchère de ${state.currentPrice.toFixed(0)} € — réputation entamée.`,
              cycle: currentCycleNumber,
            },
          });
        }
        remainingBids = remainingBids.filter((bid) => bid.playerId !== state.leaderId);
      }

      await tx.bid.deleteMany({ where: { listingId: listing.id } });
      await tx.listing.delete({ where: { id: listing.id } });
    });
  }
}

/**
 * Fait grandir le parc immobilier de chaque province avec l'activité
 * économique (même indice que computeDemandGrowthMultiplier, déjà utilisé
 * pour la taille des marchés d'entreprise) — sans ce mécanisme, le stock
 * semé une seule fois au démarrage (cf. seed.ts) resterait figé pour
 * toujours : ~92 biens au total, épuisables avec suffisamment de joueurs.
 * N'ajoute JAMAIS de biens en trop (cf. targetCount, arrondi à l'entier
 * inférieur) et ne réduit jamais le stock existant, même si l'activité
 * baisse — un bien déjà construit ne se démolit pas.
 */
async function growPropertyInventory(prisma: PrismaClient, demandGrowthMultiplier: number) {
  const municipalities = await prisma.municipality.findMany();

  for (const municipality of municipalities) {
    const profile = PROVINCE_PROPERTY_PROFILES[municipality.name];
    if (!profile) continue;

    const currentCounts = await prisma.property.groupBy({
      by: ["type"],
      where: { municipalityId: municipality.id },
      _count: { _all: true },
    });
    const currentByType = new Map(currentCounts.map((c) => [c.type, c._count._all]));

    for (const [type, baseCount] of Object.entries(profile.propertyCounts) as [ProvincePropertyType, number][]) {
      const targetCount = Math.floor(baseCount * demandGrowthMultiplier);
      const toCreate = targetCount - (currentByType.get(type) ?? 0);
      if (toCreate <= 0) continue;

      const range = PROPERTY_TYPE_RANGES[type];
      for (let i = 0; i < toCreate; i++) {
        const marketValue = Math.round(
          (range.minValue + Math.random() * (range.maxValue - range.minValue)) * profile.priceMultiplier,
        );
        const baseRent = Math.round(marketValue * range.rentYieldPerCycle * 100) / 100;
        const property = await prisma.property.create({
          data: { municipalityId: municipality.id, type, marketValue, baseRent, status: "VACANT" },
        });
        await prisma.listing.create({
          data: { propertyId: property.id, price: property.marketValue, isAuction: false, expiresAt: new Date("2099-01-01") },
        });
      }
    }
  }
}

export async function estimateNetPerCycle(prisma: PrismaClient, annualGrossSalary: number): Promise<number> {
  const { ipp } = await getLatestTaxRuleSet(prisma);
  const { netAnnualIncome } = calculateNetAnnualIncome(annualGrossSalary, ipp, DEFAULT_COMMUNAL_SURCHARGE_RATE);
  return netAnnualIncome / CYCLES_PER_YEAR;
}

/**
 * Projection du revenu net d'une activité complémentaire AVANT engagement —
 * agrège le revenu annexe déclaré au salaire principal pour l'IPP (barème
 * progressif partagé) et isole l'impôt marginal réellement imputable à
 * l'activité, plutôt qu'une simple moyenne : un revenu annexe ajouté au
 * sommet d'un revenu déjà taxé subit le taux de la tranche la plus haute
 * atteinte, pas le taux moyen — la leçon fiscale du complémentaire.
 */
export async function estimateIndependentActivityNetPerCycle(
  prisma: PrismaClient,
  mainAnnualGrossSalary: number,
  sideGrossRevenuePerCycle: number,
): Promise<{
  netPerCycle: number;
  socialContributionsPerCycle: number;
  marginalTaxRateOnSide: number;
  wellbeingDrainPerCycle: number;
}> {
  const { ipp, selfEmployed } = await getLatestTaxRuleSet(prisma);

  const salaryNetTaxable = applySocialContributions(mainAnnualGrossSalary, ipp);
  const sideAnnualGrossRevenue = sideGrossRevenuePerCycle * CYCLES_PER_YEAR;
  const sideSocialContributions = calculateSelfEmployedContributions(sideAnnualGrossRevenue, selfEmployed.brackets);
  const sideNetTaxable = sideAnnualGrossRevenue - sideSocialContributions;

  const { totalTax: totalTaxWithSide } = calculateIpp(
    salaryNetTaxable + sideNetTaxable,
    ipp,
    DEFAULT_COMMUNAL_SURCHARGE_RATE,
  );
  const { totalTax: totalTaxWithoutSide } = calculateIpp(salaryNetTaxable, ipp, DEFAULT_COMMUNAL_SURCHARGE_RATE);
  const marginalTaxOnSide = totalTaxWithSide - totalTaxWithoutSide;
  const sideNetAnnual = sideNetTaxable - marginalTaxOnSide;

  return {
    netPerCycle: sideNetAnnual / CYCLES_PER_YEAR,
    socialContributionsPerCycle: sideSocialContributions / CYCLES_PER_YEAR,
    marginalTaxRateOnSide: sideNetTaxable > 0 ? marginalTaxOnSide / sideNetTaxable : 0,
    wellbeingDrainPerCycle: computeIndependentActivityWellbeingDrain(sideGrossRevenuePerCycle),
  };
}

/**
 * Clôture le cycle actuellement ouvert, pour TOUS les joueurs (pas
 * seulement ceux en emploi) et toutes les entreprises actives :
 * - bien-être : régénération passive de base, drainée par la pression du
 *   poste (atténuée par la tolérance sectorielle) pour les joueurs employés
 * - salaire net, ajusté par le multiplicateur lié au bien-être (section
 *   9bis), et réputation passive pour les joueurs employés
 * - profit net d'entreprise (revenu - coûts - ISOC), réparti aux
 *   actionnaires au prorata de leurs parts (CompanyShare)
 * - expérience sectorielle cumulée (jamais réinitialisée)
 * - un instantané PlayerStatHistory par joueur et CompanyCycleReport par
 *   entreprise
 * puis ouvre le cycle suivant. Déclenché uniquement par le cron externe (cf.
 * apps/api/src/cycles/cycles.controller.ts POST /cycles/internal-close) —
 * jamais à la demande du joueur, sous peine de lui permettre de générer du
 * patrimoine à l'infini en boucle.
 */
/**
 * Le corps de la fonction ci-dessous fait un aller-retour base de données
 * séquentiel PAR JOUEUR et PAR ENTREPRISE (pas de createMany/updateMany
 * groupé) — largement suffisant à l'échelle d'un petit groupe, mais le
 * timeout par défaut de Prisma (5s) serait dépassé bien avant d'atteindre
 * des centaines de joueurs. Relevé explicitement avec une marge confortable
 * plutôt que de laisser la transaction échouer silencieusement le jour où
 * le groupe grandit — si le jeu doit un jour supporter des milliers de
 * joueurs, la vraie solution sera de regrouper ces écritures, pas de
 * repousser encore ce plafond.
 */
const CYCLE_CLOSE_TRANSACTION_OPTIONS = { maxWait: 10_000, timeout: 300_000 };

export async function closeCurrentCycle(prisma: PrismaClient) {
  const { ipp, isoc, capitalGains, selfEmployed } = await getLatestTaxRuleSet(prisma);
  const openCycle = await getOrCreateOpenCycle(prisma);

  // Réglé dans une transaction séparée, avant tout le reste : le patrimoine
  // liquide déjà à jour doit être vu par la boucle joueurs plus bas (cf.
  // settleExpiredAuctions).
  await settleExpiredAuctions(prisma, openCycle.number);

  const [
    players,
    companies,
    sectors,
    sectorCompetitors,
    commodityMarkets,
    financialAssets,
    assetHoldings,
    ownedProperties,
    mortgageLoans,
    commodityHoldings,
    savingsAccounts,
    personalGoods,
    independentActivities,
    bankDeposits,
    guilds,
    regions,
    sectoralEvents,
    insurancePolicies,
    playerAchievements,
    infrastructureFundAggregate,
  ] = await Promise.all([
    prisma.player.findMany({
      include: {
        stats: true,
        employments: { where: { endedCycle: null }, take: 1 },
        sectorExperience: true,
      },
    }),
    prisma.company.findMany({
      where: { status: "ACTIVE" },
      include: {
        shares: true,
        products: true,
        loans: { where: { status: "ACTIVE" } },
        loansAsLender: { where: { status: "ACTIVE" } },
        deposits: { where: { withdrawnCycle: null } },
        departments: true,
        employeeCounts: true,
        municipality: { select: { name: true, regionId: true, infrastructureFund: true } },
      },
    }),
    prisma.sector.findMany(),
    prisma.sectorCompetitor.findMany(),
    prisma.commodityMarket.findMany(),
    prisma.financialAsset.findMany(),
    prisma.playerAssetHolding.findMany({ where: { quantity: { gt: 0 } } }),
    prisma.property.findMany({
      where: { ownerId: { not: null } },
      include: { leases: { where: { status: "ACTIVE" }, take: 1 }, municipality: { select: { name: true } } },
    }),
    prisma.loan.findMany({
      where: { status: "ACTIVE" },
      include: { collateralProperty: true, lenderCompany: { select: { name: true } } },
    }),
    prisma.playerCommodityHolding.findMany(),
    prisma.savingsAccount.findMany({ where: { withdrawnCycle: null } }),
    prisma.personalGood.findMany({ where: { soldCycle: null } }),
    prisma.independentActivity.findMany(),
    prisma.bankDeposit.findMany({ where: { withdrawnCycle: null } }),
    prisma.guild.findMany({ where: { status: "ACTIVE" }, include: { members: true } }),
    prisma.region.findMany(),
    prisma.sectoralEvent.findMany({ where: { endCycle: { gte: openCycle.number } } }),
    prisma.insurancePolicy.findMany({ where: { status: "ACTIVE" } }),
    prisma.playerAchievement.findMany({ select: { playerId: true, achievementId: true } }),
    prisma.municipality.aggregate({ _sum: { infrastructureFund: true } }),
  ]);

  // Croissance de la demande (cf. domain/market.ts,
  // computeDemandGrowthMultiplier) — un seul indice d'activité économique
  // global, alimenté par le nombre de joueurs inscrits et l'investissement
  // communal cumulé en infrastructure (toutes communes confondues, pas
  // seulement celles avec une entreprise active) : sans ce facteur, la
  // taille de chaque marché (cf. computeMarketPoolSize plus bas) resterait
  // une constante figée quel que soit le nombre de joueurs.
  const demandGrowthMultiplier = computeDemandGrowthMultiplier(
    players.length,
    infrastructureFundAggregate._sum.infrastructureFund?.toNumber() ?? 0,
  );
  // Hors de la transaction principale (comme settleExpiredAuctions) : purement
  // additif, ne dépend de rien d'autre dans ce cycle et n'a pas besoin d'être
  // atomique avec le reste.
  await growPropertyInventory(prisma, demandGrowthMultiplier);

  // Jalons de progression moyen terme (cf. domain/achievements.ts,
  // NET_WORTH_MILESTONES/COMPANY_PROFIT_MILESTONES/INVESTMENT_LEVEL_MILESTONES)
  // — snapshot des défis déjà débloqués, pris avant la transaction comme les
  // autres maps ci-dessous : rien d'autre dans ce cycle ne peut les modifier
  // entre-temps.
  const unlockedAchievementsByPlayer = new Map<string, Set<string>>();
  for (const achievement of playerAchievements) {
    const set = unlockedAchievementsByPlayer.get(achievement.playerId) ?? new Set<string>();
    set.add(achievement.achievementId);
    unlockedAchievementsByPlayer.set(achievement.playerId, set);
  }

  const independentActivityByPlayer = new Map<string, (typeof independentActivities)[number]>();
  for (const activity of independentActivities) {
    independentActivityByPlayer.set(activity.playerId, activity);
  }

  const sectorById = new Map(sectors.map((sector) => [sector.id, sector]));
  const sectorIdByName = new Map(sectors.map((sector) => [sector.name, sector.id]));
  const regionById = new Map(regions.map((region) => [region.id, region]));

  // Aléas sectoriels/régionaux (cf. domain/sectoral-events.ts) — un tirage
  // au plus par cycle, effets composés appliqués plus bas (pool de marché
  // national + attractivité effective régionale). Un MAJEUR fraîchement
  // tiré ne prend effet que warningCycles plus tard (signal en presse
  // publié tout de suite, impact réel différé) ; les autres paliers
  // démarrent immédiatement.
  const newSectoralEvent = rollSectoralEvent(sectors, regions, openCycle.number);
  const activeSectoralEffects: ActiveSectoralEffect[] = sectoralEvents
    .filter((e) => e.startCycle <= openCycle.number && e.endCycle >= openCycle.number)
    .map((e) => ({
      scope: e.scope,
      regionId: e.regionId,
      primarySectorId: e.primarySectorId,
      primaryMagnitude: e.primaryMagnitude.toNumber(),
      correlatedSectorId: e.correlatedSectorId,
      correlatedMagnitude: e.correlatedMagnitude ? e.correlatedMagnitude.toNumber() : null,
    }));
  if (newSectoralEvent && newSectoralEvent.startCycle <= openCycle.number) {
    activeSectoralEffects.push({
      scope: newSectoralEvent.scope,
      regionId: newSectoralEvent.regionId,
      primarySectorId: newSectoralEvent.primarySectorId,
      primaryMagnitude: newSectoralEvent.primaryMagnitude,
      correlatedSectorId: newSectoralEvent.correlatedSectorId,
      correlatedMagnitude: newSectoralEvent.correlatedMagnitude,
    });
  }
  // MAJEUR déjà en base, dont l'impact démarre précisément ce cycle-ci
  // (signal déjà publié à sa création) — matière à un titre de presse
  // "impact" distinct du signal d'alerte.
  const sectoralEventsStartingNow = sectoralEvents.filter(
    (e) => e.startCycle === openCycle.number && e.tier === "MAJOR",
  );

  const insurancePolicyByInsuredCompany = new Map(
    insurancePolicies.filter((p) => p.insuredCompanyId).map((p) => [p.insuredCompanyId as string, p]),
  );

  const personalGoodsByPlayer = new Map<string, typeof personalGoods>();
  for (const good of personalGoods) {
    const list = personalGoodsByPlayer.get(good.playerId) ?? [];
    list.push(good);
    personalGoodsByPlayer.set(good.playerId, list);
  }

  const savingsAccountsByPlayer = new Map<string, typeof savingsAccounts>();
  for (const account of savingsAccounts) {
    const list = savingsAccountsByPlayer.get(account.playerId) ?? [];
    list.push(account);
    savingsAccountsByPlayer.set(account.playerId, list);
  }

  // Immobilier : les biens loués rapportent un loyer (réduit par leur état)
  // et s'usent deux fois plus vite que ceux laissés vacants — négliger
  // l'entretien coûte directement en revenu futur (cf. domain/property.ts).
  const propertyUpdates = ownedProperties.map((property) => {
    const activeLease = property.leases[0];
    const isRented = Boolean(activeLease);
    const condition = property.condition.toNumber();
    const rentCollected = isRented ? computeCollectedRent(property.baseRent.toNumber(), condition) : 0;
    const newCondition = Math.max(0, condition - computePropertyConditionDecay(isRented));
    return { property, ownerId: property.ownerId!, rentCollected, newCondition };
  });
  const propertyWealthDeltaByPlayer = new Map<string, number>();
  // Suivi séparé du loyer seul (cf. PlayerCycleReport, récap par joueur) —
  // propertyWealthDeltaByPlayer ci-dessus reste le total loyer+échéance déjà
  // utilisé partout ailleurs (projectedWealth, wealthDelta), inchangé.
  const rentIncomeByPlayer = new Map<string, number>();
  for (const update of propertyUpdates) {
    if (update.rentCollected > 0) {
      propertyWealthDeltaByPlayer.set(update.ownerId, (propertyWealthDeltaByPlayer.get(update.ownerId) ?? 0) + update.rentCollected);
      rentIncomeByPlayer.set(update.ownerId, (rentIncomeByPlayer.get(update.ownerId) ?? 0) + update.rentCollected);
    }
  }

  // Prêts (hypothécaires SYSTEM ou communautaires COMPANY, cf.
  // domain/mortgage.ts et domain/community-lending.ts) : même échéance
  // (amortissement + intérêts) que les prêts d'entreprise, prélevée
  // directement sur le patrimoine liquide du joueur. Un prêt communautaire
  // crédite en plus l'échéance à la trésorerie de l'entreprise prêteuse
  // (cf. communityLoanCreditByLenderCompany, appliqué plus bas dans la
  // boucle entreprises). Le défaut (vérifié une fois le patrimoine du cycle
  // connu, dans la boucle joueurs ci-dessous) entraîne la saisie du bien mis
  // en garantie s'il y en a un (hypothèque) — rien à saisir pour un prêt
  // communautaire, juste une perte sèche pour l'entreprise prêteuse.
  const mortgagePaymentsByPlayer = new Map<
    string,
    { loan: (typeof mortgageLoans)[number]; principalPortion: number; interest: number; totalPayment: number }[]
  >();
  const communityLoanCreditByLenderCompany = new Map<string, number>();
  const mortgagePaymentAmountByPlayer = new Map<string, number>();
  for (const loan of mortgageLoans) {
    const payment = computeLoanCyclePayment({
      principal: loan.principal.toNumber(),
      termCycles: loan.termCycles,
      remainingBalance: loan.remainingBalance.toNumber(),
      rate: loan.rate.toNumber(),
    });
    const list = mortgagePaymentsByPlayer.get(loan.borrowerPlayerId) ?? [];
    list.push({ loan, principalPortion: payment.principalPortion, interest: payment.interest, totalPayment: payment.totalPayment });
    mortgagePaymentsByPlayer.set(loan.borrowerPlayerId, list);
    propertyWealthDeltaByPlayer.set(
      loan.borrowerPlayerId,
      (propertyWealthDeltaByPlayer.get(loan.borrowerPlayerId) ?? 0) - payment.totalPayment,
    );
    mortgagePaymentAmountByPlayer.set(
      loan.borrowerPlayerId,
      (mortgagePaymentAmountByPlayer.get(loan.borrowerPlayerId) ?? 0) - payment.totalPayment,
    );
    if (loan.lenderType === "COMPANY" && loan.lenderCompanyId) {
      communityLoanCreditByLenderCompany.set(
        loan.lenderCompanyId,
        (communityLoanCreditByLenderCompany.get(loan.lenderCompanyId) ?? 0) + payment.totalPayment,
      );
    }
  }

  // Bourse des matières premières : le pool s'approfondit avec la
  // population de joueurs (jamais réduit), cf. domain/commodity.ts et
  // computeCommodityPoolGrowth — préserve le prix courant, seuls les
  // échanges des joueurs le font bouger.
  const targetCommodityReserve = COMMODITY_POOL_PER_PLAYER * Math.max(1, players.length);
  const commodityMarketUpdates = commodityMarkets.map((market) => {
    const grown = computeCommodityPoolGrowth(
      market.commodityReserve.toNumber(),
      market.cashReserve.toNumber(),
      targetCommodityReserve,
    );
    return { market, ...grown, price: computeSpotPrice(grown.commodityReserve, grown.cashReserve) };
  });

  // Bourse d'actifs financiers : marche aléatoire propre à chaque actif
  // (cf. domain/financial-assets.ts, computeNextAssetPrice) — indépendante
  // des échanges joueurs, contrairement au marché de matières premières.
  // Les actions rattachées à un secteur (definition.sectorName) reçoivent en
  // plus un supplément de dérive quand ce secteur subit un aléa NATIONAL
  // (MAJEUR/EXCEPTIONNEL) — même multiplicateur composé que celui utilisé
  // pour le pool de marché des entreprises du secteur, cf.
  // computeSectoralDemandMultiplier plus haut.
  const financialAssetUpdates = financialAssets.map((asset) => {
    const definition = FINANCIAL_ASSET_CATALOG[asset.key];
    let sectoralDriftBump = 0;
    if (definition?.sectorName) {
      const sectorId = sectorIdByName.get(definition.sectorName);
      if (sectorId) {
        const sectoralMultiplier = computeSectoralDemandMultiplier(activeSectoralEffects, sectorId, "NATIONAL", null);
        sectoralDriftBump = (sectoralMultiplier - 1) * FINANCIAL_ASSET_SECTORAL_DRIFT_SENSITIVITY;
      }
    }
    const nextPrice = definition
      ? computeNextAssetPrice(asset.price.toNumber(), definition.drift, definition.volatility, sectoralDriftBump)
      : asset.price.toNumber();
    return { asset, previousPrice: asset.price.toNumber(), nextPrice };
  });
  const nextAssetPriceById = new Map(financialAssetUpdates.map((u) => [u.asset.id, u.nextPrice]));
  const assetById = new Map(financialAssets.map((asset) => [asset.id, asset]));
  const assetHoldingsByPlayer = new Map<string, typeof assetHoldings>();
  for (const holding of assetHoldings) {
    const list = assetHoldingsByPlayer.get(holding.playerId) ?? [];
    list.push(holding);
    assetHoldingsByPlayer.set(holding.playerId, list);
  }

  // Banques-joueurs : intérêt composé par cycle sur chaque dépôt, payé par
  // la banque (coût brut) et reçu net de précompte par le déposant — cf.
  // domain/banking.ts, game-engine/banking.ts. Régime propre, pas de
  // franchise partagée avec l'épargne/les actifs financiers.
  const bankDepositUpdates = bankDeposits.map((deposit) => {
    const { grossInterest, netInterest } = computeBankDepositInterest(
      deposit.balance.toNumber(),
      deposit.rate.toNumber(),
      capitalGains.rate,
    );
    return { deposit, grossInterest, netInterest };
  });
  const depositInterestPaidByCompany = new Map<string, number>();
  for (const update of bankDepositUpdates) {
    depositInterestPaidByCompany.set(
      update.deposit.companyId,
      (depositInterestPaidByCompany.get(update.deposit.companyId) ?? 0) + update.grossInterest,
    );
  }

  // Patrimoine total (cf. domain "classement") : cash + équité immobilière
  // (valeur - hypothèques restantes) + quote-part dans les entreprises
  // détenues (bilan simplifié, cf. assembleCompanyBalanceSheet) +
  // valorisation des matières premières détenues, au prix courant du
  // cycle — un instantané pris une fois par cycle, pas suivi en temps réel.
  const mortgageBalanceByPropertyId = new Map<string, number>();
  for (const loan of mortgageLoans) {
    if (loan.collateralPropertyId) {
      mortgageBalanceByPropertyId.set(loan.collateralPropertyId, loan.remainingBalance.toNumber());
    }
  }
  const propertyEquityByPlayer = new Map<string, number>();
  for (const property of ownedProperties) {
    const equity = property.marketValue.toNumber() - (mortgageBalanceByPropertyId.get(property.id) ?? 0);
    propertyEquityByPlayer.set(property.ownerId!, (propertyEquityByPlayer.get(property.ownerId!) ?? 0) + equity);
  }

  // Équité AUTONOME de chaque société (bilan comptable, hors participations
  // détenues) — base commune aux deux consolidations groupe/holding
  // ci-dessous : valeur comptable (companies.service.ts, pour l'affichage
  // live du bilan/capacité d'emprunt) et valeur de marché (ici, pour le
  // patrimoine net — cf. computeValorizationMultiplier plus bas).
  const standaloneEquityByCompany = new Map<string, number>();
  for (const company of companies) {
    standaloneEquityByCompany.set(company.id, assembleCompanyBalanceSheet(company).equity);
  }

  // Valorisation par rentabilité soutenue (cf. domain/valorization.ts,
  // computeValorizationMultiplier) — UNIQUEMENT pour le patrimoine net et le
  // classement, jamais pour le bilan comptable ci-dessus (capacité
  // d'emprunt, prix plancher d'OPA restent en valeur comptable pure). Le
  // multiplicateur PROPRE de chaque société s'applique à SES actifs propres
  // seulement — une participation détenue porte déjà le multiplicateur de sa
  // cible, pas de double comptage en le réappliquant à la holding.
  const ownMarketValueByCompany = new Map<string, number>();
  for (const company of companies) {
    const cyclesActive = Math.max(1, openCycle.number - company.foundedCycle);
    const multiplier = computeValorizationMultiplier(company.cumulativeNetProfit.toNumber(), cyclesActive);
    ownMarketValueByCompany.set(company.id, (standaloneEquityByCompany.get(company.id) ?? 0) * multiplier);
  }
  const marketValueStakesHeldByCompany = new Map<string, number>();
  for (const company of companies) {
    for (const share of company.shares) {
      if (!share.holderCompanyId) continue;
      const sharePercentage = share.sharePercentage.toNumber();
      if (sharePercentage <= 0) continue;
      const stake = (ownMarketValueByCompany.get(company.id) ?? 0) * (sharePercentage / 100);
      marketValueStakesHeldByCompany.set(
        share.holderCompanyId,
        (marketValueStakesHeldByCompany.get(share.holderCompanyId) ?? 0) + stake,
      );
    }
  }

  const companyEquityByPlayer = new Map<string, number>();
  for (const company of companies) {
    const totalMarketValue =
      (ownMarketValueByCompany.get(company.id) ?? 0) + (marketValueStakesHeldByCompany.get(company.id) ?? 0);
    for (const share of company.shares) {
      if (!share.playerId) continue;
      const sharePercentage = share.sharePercentage.toNumber();
      if (sharePercentage <= 0) continue;
      const stake = totalMarketValue * (sharePercentage / 100);
      companyEquityByPlayer.set(share.playerId, (companyEquityByPlayer.get(share.playerId) ?? 0) + stake);
    }
  }

  const commodityPriceBySector = new Map(commodityMarketUpdates.map((u) => [u.market.sectorId, u.price]));
  const commodityValueByPlayer = new Map<string, number>();
  for (const holding of commodityHoldings) {
    const price = commodityPriceBySector.get(holding.sectorId) ?? 0;
    const value = holding.quantity.toNumber() * price;
    commodityValueByPlayer.set(holding.playerId, (commodityValueByPlayer.get(holding.playerId) ?? 0) + value);
  }

  // Compétitivité cumulée des concurrents IA par secteur — seul le marché
  // "core" en tient compte (cf. domain/market.ts, computeMarketPoolSize) :
  // les IA ne font pas de R&D, elles ne concurrencent jamais les autres
  // gammes.
  const npcCompetitivenessSumBySector = new Map<string, number>();
  for (const competitor of sectorCompetitors) {
    npcCompetitivenessSumBySector.set(
      competitor.sectorId,
      (npcCompetitivenessSumBySector.get(competitor.sectorId) ?? 0) + competitor.competitiveness.toNumber(),
    );
  }

  // Le propriétaire ULTIME (part la plus élevée, en remontant les chaînes de
  // holding — cf. CompanyShare.holderCompany) détermine si l'entreprise subit
  // la pénalité d'attention divisée (computeAttentionMultiplier), à qui va sa
  // réputation, etc. — un joueur qui loge ses filiales dans une holding qu'il
  // contrôle reste soumis aux mêmes mécaniques que s'il les possédait
  // directement (pas un moyen de contourner la pénalité d'attention).
  const sharesByCompanyId = new Map(companies.map((company) => [company.id, company.shares]));
  function resolveUltimateControllerId(companyId: string, depth = 0): string | undefined {
    if (depth > 6) return undefined;
    const shares = sharesByCompanyId.get(companyId);
    if (!shares || shares.length === 0) return undefined;
    const top = shares.reduce((max, share) => (share.sharePercentage.gt(max.sharePercentage) ? share : max), shares[0]);
    if (top.playerId) return top.playerId;
    if (top.holderCompanyId) return resolveUltimateControllerId(top.holderCompanyId, depth + 1);
    return undefined;
  }
  const primaryOwnerIdByCompany = new Map(companies.map((company) => [company.id, resolveUltimateControllerId(company.id)]));
  const activeCompanyCountByOwner = new Map<string, number>();
  // Managers embauchables en pilote semi-automatique (cf.
  // domain/company.ts UNMANAGED_COMPANY_WELLBEING_DRAIN_PER_CYCLE) — une
  // entreprise active sans manager, pilotée personnellement par son
  // actionnaire principal, draine un peu de son bien-être chaque cycle.
  const unmanagedActiveCompanyCountByOwner = new Map<string, number>();
  for (const company of companies) {
    const ownerId = primaryOwnerIdByCompany.get(company.id);
    if (!ownerId) continue;
    activeCompanyCountByOwner.set(ownerId, (activeCompanyCountByOwner.get(ownerId) ?? 0) + 1);
    if (!company.hasManager) {
      unmanagedActiveCompanyCountByOwner.set(ownerId, (unmanagedActiveCompanyCountByOwner.get(ownerId) ?? 0) + 1);
    }
  }

  // Cartels (section 12quinquies) : détection automatique à chaque cycle,
  // probabilité croissante avec l'écart au prix de référence et le nombre
  // de membres (cf. domain/guild.ts, game-engine/guild.ts) — en cas de
  // découverte, dissolution immédiate, amende et réputation entamée pour
  // chaque membre. Un cartel à un seul membre n'est pas une entente.
  const companyById = new Map(companies.map((company) => [company.id, company]));
  const detectedGuilds = guilds.filter(
    (guild) => guild.members.length >= 2 && rollGuildDetection(guild.priceFloor.toNumber(), REFERENCE_UNIT_PRICE, guild.members.length),
  );
  const guildFineByCompany = new Map<string, number>();
  const guildReputationPenaltyByOwner = new Map<string, number>();
  for (const guild of detectedGuilds) {
    for (const member of guild.members) {
      const company = companyById.get(member.companyId);
      if (!company) continue;
      const fine = Math.min(GUILD_FINE_PER_MEMBER, company.cashReserve.toNumber());
      guildFineByCompany.set(member.companyId, (guildFineByCompany.get(member.companyId) ?? 0) + fine);
      const ownerId = primaryOwnerIdByCompany.get(member.companyId);
      if (ownerId) {
        guildReputationPenaltyByOwner.set(
          ownerId,
          (guildReputationPenaltyByOwner.get(ownerId) ?? 0) + GUILD_REPUTATION_PENALTY,
        );
      }
    }
  }

  // Pass 1 : tout ce qui ne dépend PAS du marché partagé (niveaux,
  // capacité, coût unitaire, compétitivité relative de chaque gamme active).
  const companyContexts = companies.map((company) => {
    const ownerId = primaryOwnerIdByCompany.get(company.id);
    const ownerCompanyCount = ownerId ? (activeCompanyCountByOwner.get(ownerId) ?? 1) : 1;

    const levels = {
      marketing: computeEffectiveInvestmentLevel(company.marketingInvestment.toNumber()),
      quality: computeEffectiveInvestmentLevel(company.rdInvestment.toNumber()),
      equipment: computeEffectiveInvestmentLevel(company.equipmentInvestment.toNumber()),
      workConditions: computeEffectiveInvestmentLevel(company.workConditionsInvestment.toNumber()),
      automation: computeEffectiveInvestmentLevel(company.automationInvestment.toNumber()),
      branding: computeEffectiveInvestmentLevel(company.brandingInvestment.toNumber()),
      innovation: computeEffectiveInvestmentLevel(company.innovationInvestment.toNumber()),
      training: computeEffectiveInvestmentLevel(company.trainingInvestment.toNumber()),
      safety: computeEffectiveInvestmentLevel(company.safetyInvestment.toNumber()),
      insurance: computeEffectiveInvestmentLevel(company.insuranceInvestment.toNumber()),
    };

    // Organisation & RH : les effectifs sont assignés par département (cf.
    // domain/organization.ts), chacun avec son propre moral vivant — dérive
    // vers une base financée par "conditions de travail", amputée sans
    // responsable dédié (cf. computeDepartmentMoraleBaseline/Drift). La
    // capacité de production agrège la contribution de chaque département,
    // pondérée par SON moral (cf. computeEmployeeCapacityMultiplier).
    const emptyTierCounts = (): EmployeeCountsByTier => ({ unskilled: 0, qualified: 0, specialist: 0 });
    const countsByDepartment = new Map<Department, EmployeeCountsByTier>(
      DEPARTMENTS.map((d) => [d, emptyTierCounts()]),
    );
    for (const row of company.employeeCounts) {
      const counts = countsByDepartment.get(row.department as Department);
      if (counts) counts[row.tier as EmployeeTier] = row.count;
    }

    // RH : la contribution de l'équipe RH (moral courant, avant dérive)
    // relève la base de moral de TOUS les départements — calculée avant les
    // autres car elle influence leur propre calcul de baseline ci-dessous.
    const hrDeptRow = company.departments.find((d) => d.department === "hr");
    const hrCurrentMorale = hrDeptRow?.morale.toNumber() ?? 50;
    const hrContribution = computeDepartmentContribution(countsByDepartment.get("hr")!, hrCurrentMorale);
    const hrMoraleBaselineBonus = computeHrStaffMoraleBonus(hrContribution);

    const departmentUpdates = DEPARTMENTS.map((department) => {
      const deptRow = company.departments.find((d) => d.department === department);
      const currentMorale = deptRow?.morale.toNumber() ?? 50;
      const hasManager = deptRow?.hasManager ?? false;
      const baseline = Math.min(
        100,
        computeDepartmentMoraleBaseline(levels.workConditions, hasManager) + hrMoraleBaselineBonus,
      );
      const newMorale = computeDepartmentMoraleDrift(currentMorale, baseline);
      return { department, currentMorale, newMorale, hasManager, counts: countsByDepartment.get(department)! };
    });

    const productionUpdate = departmentUpdates.find((d) => d.department === "production")!;
    const productionDepartment: DepartmentEmployeeCounts = {
      morale: productionUpdate.currentMorale,
      counts: productionUpdate.counts,
    };
    // Ventes : multiplicateur de compétitivité (cf. computeSalesCompetitivenessMultiplier).
    const salesUpdate = departmentUpdates.find((d) => d.department === "sales")!;
    const salesContribution = computeDepartmentContribution(salesUpdate.counts, salesUpdate.currentMorale);
    const salesCompetitivenessMultiplier = computeSalesCompetitivenessMultiplier(salesContribution);
    // R&D : bonus de points de niveau d'innovation en plus de l'investissement en argent.
    const rdUpdate = departmentUpdates.find((d) => d.department === "rd")!;
    const rdContribution = computeDepartmentContribution(rdUpdate.counts, rdUpdate.currentMorale);
    const rdStaffInnovationBonus = computeRdStaffInnovationBonus(rdContribution);
    // Pas de plafond à 100 ici : levels.innovation intègre déjà le palier
    // mondial au-delà de 100 (cf. computeEffectiveInvestmentLevel) — un
    // niveau élevé continue de compter pour le déblocage des gammes et la
    // compétitivité, sans mur artificiel.
    const effectiveInnovationLevel = levels.innovation + rdStaffInnovationBonus;

    const departmentManagerSalaryCosts = departmentUpdates
      .filter((d) => d.hasManager)
      .reduce((sum) => sum + DEPARTMENT_MANAGER_SALARY_PER_CYCLE, 0);

    const employeeCounts: EmployeeCountsByTier = emptyTierCounts();
    for (const d of departmentUpdates) {
      for (const tier of EMPLOYEE_TIERS) {
        employeeCounts[tier] += d.counts[tier];
      }
    }

    // Aléa sectoriel RÉGIONAL (cf. sectoral-events.ts) : contrairement à la
    // portée NATIONALE (appliquée au pool de marché entier, plus bas), une
    // portée régionale n'affecte que l'attractivité effective des
    // entreprises de la région touchée — pas de pool de marché partagé par
    // (secteur, commune/région) dans ce moteur.
    const regionalSectoralMultiplier = computeSectoralDemandMultiplier(
      activeSectoralEffects,
      company.sectorId,
      "REGIONAL",
      company.municipality.regionId,
    );
    // Infrastructures communales (cf. domain/municipality-governance.ts) —
    // bénéfice PARTAGÉ par toutes les entreprises de la commune, financé
    // collectivement (cf. companies bonus additif, pas multiplicatif comme
    // le manager pour rester cohérent avec MANAGER_ATTRACTIVENESS_BONUS).
    const infrastructureBonus = computeInfrastructureAttractivenessBonus(company.municipality.infrastructureFund.toNumber());
    // Spécialisation économique provinciale (cf. domain/province-profiles.ts)
    // — un avantage structurel permanent, pas un aléa temporaire comme le
    // multiplicateur sectoriel régional ci-dessus : une entreprise Métaux à
    // Liège ou Bois en province de Luxembourg profite de l'ancrage
    // historique réel de la province dans ce secteur.
    const provinceAffinityBonus = PROVINCE_SECTOR_AFFINITIES[company.municipality.name]?.includes(
      sectorById.get(company.sectorId)?.name ?? "",
    )
      ? PROVINCE_SECTOR_AFFINITY_BONUS
      : 0;
    const effectiveAttractiveness =
      (computeEffectiveAttractiveness(company.attractivenessScore.toNumber(), company.hasManager) +
        infrastructureBonus +
        provinceAffinityBonus) *
      regionalSectoralMultiplier;
    const attentionMultiplier = computeAttentionMultiplier(ownerCompanyCount, company.hasManager);

    // Capacité totale partagée par toutes les gammes actives — "core"
    // absorbe automatiquement ce qui reste (100 - somme des autres gammes),
    // elle n'a jamais d'allocation réglée directement (cf.
    // domain/company.ts, setProductAllocationInputSchema).
    const totalCapacity =
      computeProductionCapacity(productionDepartment, levels.equipment, levels.training) * attentionMultiplier;
    const nonCoreAllocationSum = company.products
      .filter((p) => p.type !== "core")
      .reduce((sum, p) => sum + p.capacityAllocation.toNumber(), 0);

    const productContexts = company.products.map((product) => {
      const productType = product.type as ProductType;
      const allocationPercent =
        productType === "core" ? Math.max(0, 100 - nonCoreAllocationSum) : product.capacityAllocation.toNumber();
      const capacity = totalCapacity * (allocationPercent / 100);
      const unitPrice = product.unitPrice.toNumber();
      const unitCost = computeProductUnitCost(levels.automation, levels.quality, productType);
      const competitiveness =
        computeCompetitiveness({
          effectiveAttractiveness,
          marketingLevel: levels.marketing,
          qualityLevel: levels.quality,
          brandingLevel: levels.branding,
          innovationLevel: effectiveInnovationLevel,
          unitPrice,
          productType,
        }) * salesCompetitivenessMultiplier;

      return { product, productType, sectorId: company.sectorId, capacity, unitPrice, unitCost, competitiveness };
    });

    // Finance : amortissement de l'équipement (seul levier traité comme un
    // actif physique) + échéances des prêts actifs — deux coûts fixes de
    // plus, comme les salaires (cf. domain/finance.ts, packages/game-engine/src/finance.ts).
    const equipmentBookValueBefore = computeEquipmentBookValue(
      company.equipmentInvestment.toNumber(),
      company.equipmentAccumulatedDepreciation.toNumber(),
    );
    const depreciationExpense = computeEquipmentDepreciation(equipmentBookValueBefore);

    const loanPayments = company.loans.map((loan) => ({
      loan,
      ...computeLoanCyclePayment({
        principal: loan.principal.toNumber(),
        termCycles: loan.termCycles,
        remainingBalance: loan.remainingBalance.toNumber(),
        rate: loan.rate.toNumber(),
      }),
    }));
    const totalLoanPayments = loanPayments.reduce((sum, p) => sum + p.totalPayment, 0);

    return {
      company,
      ownerId,
      levels,
      employeeCounts,
      productContexts,
      depreciationExpense,
      loanPayments,
      totalLoanPayments,
      departmentUpdates,
      departmentManagerSalaryCosts,
    };
  });

  // Pass 2 : regroupe toutes les gammes actives par marché (secteur, type de
  // produit) pour calculer la compétitivité totale et la taille du marché
  // (cf. domain/market.ts, computeMarketPoolSize) — chaque entreprise ne
  // capte plus une demande indépendante, elle se dispute une part d'un même
  // gâteau avec ses concurrents du même marché (cf. computeCapturedDemand).
  const marketPools = new Map<string, { totalCompetitiveness: number; poolSize: number; marketingLevelSum: number }>();
  for (const ctx of companyContexts) {
    for (const pc of ctx.productContexts) {
      const key = `${pc.sectorId}:${pc.productType}`;
      const pool = marketPools.get(key) ?? { totalCompetitiveness: 0, poolSize: 0, marketingLevelSum: 0 };
      pool.totalCompetitiveness += pc.competitiveness;
      pool.marketingLevelSum += ctx.levels.marketing;
      marketPools.set(key, pool);
    }
  }
  for (const [key, pool] of marketPools) {
    const [sectorId, productType] = key.split(":") as [string, ProductType];
    const npcSum = productType === "core" ? (npcCompetitivenessSumBySector.get(sectorId) ?? 0) : 0;
    // Aléa sectoriel NATIONAL (cf. sectoral-events.ts) : multiplicateur de
    // demande appliqué au pool de marché entier du secteur — tous les
    // acteurs (joueurs + IA) du secteur en profitent ou en pâtissent
    // ensemble, le mérite relatif (compétitivité) continue de décider du
    // partage.
    const nationalSectoralMultiplier = computeSectoralDemandMultiplier(activeSectoralEffects, sectorId, "NATIONAL", null);
    // Développement du marché (cf. domain/market.ts) : l'investissement
    // marketing cumulé de toutes les entreprises actives sur CE (secteur,
    // gamme) fait grossir le gâteau lui-même, pas seulement la part de
    // chacune — jusqu'ici seul le nombre de joueurs le faisait.
    const marketDevelopmentMultiplier = 1 + computeMarketDevelopmentBonus(pool.marketingLevelSum);
    pool.poolSize =
      computeMarketPoolSize(productType, npcSum) * nationalSectoralMultiplier * demandGrowthMultiplier * marketDevelopmentMultiplier;
    if (productType === "core") {
      pool.totalCompetitiveness += npcSum;
    } else {
      // Sans ça, une entreprise seule sur une gamme hors "core" dans un
      // secteur formerait tout le dénominateur de computeCapturedDemand —
      // 100% de part de marché quel que soit son prix (cf. domain/market.ts).
      pool.totalCompetitiveness += NON_CORE_REFERENCE_COMPETITIVENESS;
    }
  }

  // Pass 3 : chaque gamme capte sa part du marché correspondant, produit et
  // vend en conséquence (cf. runProductLine), puis agrégation au niveau
  // entreprise (revenu, coûts, ISOC, événement) comme avant. Les
  // entreprises de niveau 1 dépendent en plus de matières premières
  // achetées aux entreprises de niveau 0 de leur secteur parent (chaîne de
  // valeur, section 8 du document de conception — cf. supply-chain.ts) :
  // leur gamme "core" tourne donc APRÈS celle du niveau 0, plafonnée par ce
  // qu'elles ont réussi à acheter — d'où la scission niveau 0 / niveau 1
  // plutôt qu'une seule passe uniforme comme avant.
  function computeProductResults(
    ctx: (typeof companyContexts)[number],
    overrides?: Map<string, { capacity: number; unitCost: number }>,
  ) {
    return ctx.productContexts.map((pc) => {
      const pool = marketPools.get(`${pc.sectorId}:${pc.productType}`)!;
      // "Plus d'habitants, plus de clients" — demande NETTE propre à cette
      // entreprise selon le développement de SA commune, qui ne vient du
      // panier d'aucun concurrent (contrairement au bonus d'attractivité,
      // qui ne redistribue qu'une part du même marché national partagé).
      const localDemandBonus = computeLocalInfrastructureDemandBonus(ctx.company.municipality.infrastructureFund.toNumber());
      const demand =
        computeCapturedDemand(pool.poolSize, pc.competitiveness, pool.totalCompetitiveness) * (1 + localDemandBonus);
      const marketSharePercent = computeMarketSharePercent(pc.competitiveness, pool.totalCompetitiveness);
      const override = overrides?.get(pc.product.id);
      const capacity = override?.capacity ?? pc.capacity;
      const unitCost = override?.unitCost ?? pc.unitCost;

      const line = runProductLine({
        capacity,
        demand,
        unitPrice: pc.unitPrice,
        unitCost,
        stockUnitsBefore: pc.product.stockUnits.toNumber(),
      });

      return { product: pc.product, unitPrice: pc.unitPrice, unitCost, marketSharePercent, ...line };
    });
  }

  function computeCompanyResult(
    ctx: (typeof companyContexts)[number],
    productResults: ReturnType<typeof computeProductResults>,
    revenueAdjustment = 0,
  ) {
    const {
      company,
      ownerId,
      levels,
      employeeCounts,
      depreciationExpense,
      loanPayments,
      totalLoanPayments,
      departmentUpdates,
      departmentManagerSalaryCosts,
    } = ctx;

    const aggregateRevenue = productResults.reduce((sum, r) => sum + r.revenue, 0) + revenueAdjustment;
    const aggregateVariableCosts = productResults.reduce((sum, r) => sum + r.variableCosts, 0);
    const aggregateHoldingCosts = productResults.reduce((sum, r) => sum + r.holdingCosts, 0);

    const event = rollCompanyEvent(
      aggregateRevenue,
      levels,
      company.cashReserve.toNumber(),
      totalEmployeeCount(employeeCounts),
    );
    const revenue = Math.max(0, aggregateRevenue + (event?.revenueDelta ?? 0));

    const staffCosts =
      (company.hasManager ? MANAGER_SALARY_PER_CYCLE : 0) +
      departmentManagerSalaryCosts +
      computeEmployeeSalaryCosts(employeeCounts);
    const costs = aggregateVariableCosts + aggregateHoldingCosts + staffCosts + depreciationExpense + totalLoanPayments;
    const profitPerCycle = revenue - costs;
    const taxPerCycle = calculateIsoc(profitPerCycle * CYCLES_PER_YEAR, isoc) / CYCLES_PER_YEAR;
    const netProfitPerCycle = profitPerCycle - taxPerCycle;
    const newCumulativeNetProfit = company.cumulativeNetProfit.toNumber() + netProfitPerCycle;

    // Faillite (section 10 du document de conception) : pertes cumulées
    // au-delà du seuil, cf. domain/company.ts BANKRUPTCY_CUMULATIVE_LOSS_THRESHOLD.
    // Tous les prêts actifs sont effacés d'un coup (pas seulement ceux que
    // les pertes dépassent individuellement, comme pour un défaut isolé) —
    // la banque encaisse la perte, les actionnaires ne récupèrent rien,
    // responsabilité limitée au capital déjà investi ("fresh start" : rien
    // n'empêche de refonder ensuite, cf. companies.service.ts).
    const isBankrupt = isCompanyBankrupt(newCumulativeNetProfit);

    // Défaut de paiement : règle simple et déterministe — si les pertes
    // cumulées de l'entreprise dépassent ce qu'il lui reste à rembourser
    // sur un prêt, elle ne peut plus être considérée solvable pour ce
    // prêt-là. Le solde est effacé (la banque encaisse la perte), mais
    // l'entreprise en paie le prix : réputation entamée durablement, et
    // impossible d'emprunter à nouveau tant qu'un prêt en défaut subsiste
    // (cf. companies.service.ts).
    const loanUpdates = loanPayments.map(({ loan, principalPortion }) => {
      const remainingAfterPayment = loan.remainingBalance.toNumber() - principalPortion;
      if (!isBankrupt && remainingAfterPayment <= 0.01) {
        return { loan, remainingBalance: 0, status: "PAID" as const, defaulted: false };
      }
      if (isBankrupt || newCumulativeNetProfit < -remainingAfterPayment) {
        return { loan, remainingBalance: 0, status: "DEFAULTED" as const, defaulted: true };
      }
      return { loan, remainingBalance: remainingAfterPayment, status: "ACTIVE" as const, defaulted: false };
    });
    const defaultedThisCycle = loanUpdates.some((u) => u.defaulted);
    const attractivenessScoreAfterDefault =
      defaultedThisCycle && !isBankrupt
        ? Math.max(5, company.attractivenessScore.toNumber() - LOAN_DEFAULT_ATTRACTIVENESS_PENALTY)
        : null;

    const reputationDelta =
      computeWorkConditionsReputationTrickle(levels.workConditions) +
      (event?.reputationDelta ?? 0) -
      (isBankrupt ? COMPANY_BANKRUPTCY_REPUTATION_PENALTY : 0);

    return {
      company,
      ownerId,
      revenue,
      costs,
      profitPerCycle,
      depreciationExpense,
      loanUpdates,
      defaultedThisCycle,
      attractivenessScoreAfterDefault,
      taxPerCycle,
      netProfitPerCycle,
      isBankrupt,
      reputationDelta,
      eventLabel: event?.label ?? null,
      // Perte nette d'un aléa d'entreprise négatif (déjà amortie par les
      // leviers branding/insurance et la réserve, cf. rollCompanyEvent) —
      // base assurable d'un sinistre (cf. domain/insurance.ts).
      eventLossAmount: event && !event.isPositive ? Math.abs(event.revenueDelta) : 0,
      reserveConsumed: event?.reserveConsumed ?? 0,
      unitsProduced: productResults.reduce((sum, r) => sum + r.unitsProduced, 0),
      unitsSold: productResults.reduce((sum, r) => sum + r.unitsSold, 0),
      unitsLostDemand: productResults.reduce((sum, r) => sum + r.unitsLostDemand, 0),
      stockUnitsTotal: productResults.reduce((sum, r) => sum + r.stockUnitsAfter, 0),
      productResults,
      departmentUpdates,
      /** Niveaux des 10 leviers d'investissement — exposé pour les jalons de progression moyen terme (cf. domain/achievements.ts). */
      levels,
    };
  }

  const level0Contexts = companyContexts.filter((ctx) => (sectorById.get(ctx.company.sectorId)?.level ?? 0) === 0);
  const level1Contexts = companyContexts.filter((ctx) => (sectorById.get(ctx.company.sectorId)?.level ?? 0) === 1);

  const level0ProductResultsByCompany = new Map(
    level0Contexts.map((ctx) => [ctx.company.id, computeProductResults(ctx)]),
  );

  // Chaîne de valeur : le stock "core" invendu du niveau 0 après la demande
  // consommateurs ci-dessus alimente l'achat de matières premières du
  // niveau 1 du même secteur parent (cf. supply-chain.ts) — un vendeur peut
  // très bien n'avoir aucun surplus un cycle donné, auquel cas ses
  // acheteurs potentiels sont simplement rationnés.
  const b2bMatchesWithSector: Array<{
    buyerCompanyId: string;
    sellerCompanyId: string;
    quantity: number;
    price: number;
    sectorId: string;
  }> = [];
  const parentSectorIds = new Set(
    level1Contexts
      .map((ctx) => sectorById.get(ctx.company.sectorId)?.parentSectorId)
      .filter((id): id is string => Boolean(id)),
  );
  for (const parentSectorId of parentSectorIds) {
    const sellers: B2bSeller[] = level0Contexts
      .filter((ctx) => ctx.company.sectorId === parentSectorId)
      .flatMap((ctx) => {
        const core = level0ProductResultsByCompany.get(ctx.company.id)!.find((r) => r.product.type === "core")!;
        if (core.stockUnitsAfter <= 0) return [];
        return [{ companyId: ctx.company.id, availableUnits: core.stockUnitsAfter, unitPrice: core.unitPrice }];
      });
    const buyers: B2bBuyer[] = level1Contexts
      .filter((ctx) => sectorById.get(ctx.company.sectorId)?.parentSectorId === parentSectorId)
      .map((ctx) => {
        const corePc = ctx.productContexts.find((pc) => pc.productType === "core")!;
        return { companyId: ctx.company.id, desiredUnits: corePc.capacity };
      });
    const matches = matchB2bSupply(buyers, sellers);
    b2bMatchesWithSector.push(...matches.map((m) => ({ ...m, sectorId: parentSectorId })));
  }

  const sellerB2bAdjustmentByCompany = new Map<string, { unitsSold: number; revenue: number }>();
  const buyerSupplyByCompany = new Map<string, { units: number; cost: number }>();
  for (const match of b2bMatchesWithSector) {
    const seller = sellerB2bAdjustmentByCompany.get(match.sellerCompanyId) ?? { unitsSold: 0, revenue: 0 };
    seller.unitsSold += match.quantity;
    seller.revenue += match.quantity * match.price;
    sellerB2bAdjustmentByCompany.set(match.sellerCompanyId, seller);

    const buyer = buyerSupplyByCompany.get(match.buyerCompanyId) ?? { units: 0, cost: 0 };
    buyer.units += match.quantity;
    buyer.cost += match.quantity * match.price;
    buyerSupplyByCompany.set(match.buyerCompanyId, buyer);
  }

  const level0Results = level0Contexts.map((ctx) => {
    const baseProductResults = level0ProductResultsByCompany.get(ctx.company.id)!;
    const adjustment = sellerB2bAdjustmentByCompany.get(ctx.company.id);
    if (!adjustment) return computeCompanyResult(ctx, baseProductResults);

    const productResults = baseProductResults.map((r) =>
      r.product.type === "core"
        ? {
            ...r,
            stockUnitsAfter: r.stockUnitsAfter - adjustment.unitsSold,
            unitsSold: r.unitsSold + adjustment.unitsSold,
          }
        : r,
    );
    return computeCompanyResult(ctx, productResults, adjustment.revenue);
  });

  const level1Results = level1Contexts.map((ctx) => {
    const corePc = ctx.productContexts.find((pc) => pc.productType === "core")!;
    const supply = buyerSupplyByCompany.get(ctx.company.id);
    const securedUnits = supply?.units ?? 0;
    const avgRawMaterialCost = securedUnits > 0 ? supply!.cost / securedUnits : 0;
    const overrides = new Map([
      [
        corePc.product.id,
        { capacity: Math.min(corePc.capacity, securedUnits), unitCost: corePc.unitCost + avgRawMaterialCost },
      ],
    ]);
    return computeCompanyResult(ctx, computeProductResults(ctx, overrides));
  });

  const companyResults = [...level0Results, ...level1Results];

  // Jalons de progression moyen terme (suite) — le maximum sur toutes les
  // entreprises possédées, pris ici pendant qu'on a déjà le profit cumulé
  // après ce cycle et les niveaux des 10 leviers sous la main (évite de
  // refaire ces calculs dans la boucle joueurs plus bas).
  const maxCompanyProfitByOwner = new Map<string, number>();
  const maxInvestmentLevelByOwner = new Map<string, number>();
  for (const result of companyResults) {
    if (!result.ownerId) continue;
    const cumulativeAfter = result.company.cumulativeNetProfit.toNumber() + result.netProfitPerCycle;
    maxCompanyProfitByOwner.set(
      result.ownerId,
      Math.max(maxCompanyProfitByOwner.get(result.ownerId) ?? -Infinity, cumulativeAfter),
    );
    const maxLevelThisCompany = Math.max(...Object.values(result.levels));
    maxInvestmentLevelByOwner.set(
      result.ownerId,
      Math.max(maxInvestmentLevelByOwner.get(result.ownerId) ?? 0, maxLevelThisCompany),
    );
  }

  // Employeur d'autres joueurs (cf. domain/player-employment.ts) — le
  // salaire d'un employé COMPANY est payé depuis la trésorerie réelle de
  // l'entreprise, pas un puits sans fond comme les emplois SYSTEM_NPC. Si
  // la trésorerie ne couvre pas la masse salariale totale de l'entreprise
  // ce cycle, TOUS ses employés-joueurs sont licenciés d'un coup (comme une
  // faillite en miniature) plutôt que de payer partiellement — cohérent
  // avec le reste du jeu (un prêt en défaut n'est jamais payé "en partie").
  // Calculé AVANT la distribution des bénéfices (plus bas) : la masse
  // salariale de ce cycle fait partie des obligations que la réserve de
  // trésorerie automatique retient en priorité (cf. bloc suivant).
  const companyEmploymentsByCompany = new Map<
    string,
    { playerId: string; employmentId: string; salary: number; role: string }[]
  >();
  for (const player of players) {
    const employment = player.employments[0];
    if (employment?.employerType === "COMPANY" && employment.companyId) {
      const list = companyEmploymentsByCompany.get(employment.companyId) ?? [];
      list.push({ playerId: player.id, employmentId: employment.id, salary: employment.salary.toNumber(), role: employment.role });
      companyEmploymentsByCompany.set(employment.companyId, list);
    }
  }
  const bankruptCompanyIds = new Set(companyResults.filter((r) => r.isBankrupt).map((r) => r.company.id));

  // Distribution des bénéfices (cf. domain/dividends.ts) : "dividend" (par
  // défaut) verse le profit net aux actionnaires chaque cycle, taxé au
  // précompte mobilier (30%) ; "reserve" accumule tout le profit positif
  // dans la réserve de liquidation (taxée 10% à l'entrée) plutôt que de le
  // distribuer. Une perte reste toujours répartie aux actionnaires
  // (comportement historique inchangé) quel que soit le mode — seule la
  // part POSITIVE change de traitement.
  //
  // Réserve de trésorerie automatique (audit d'équilibrage) — AVANT tout
  // auto-réinvestissement ou distribution, on retient d'abord assez du
  // profit POSITIF de ce cycle pour couvrir la masse salariale des
  // employés-joueurs et la prime d'assurance de ce même cycle si la
  // trésorerie déjà en caisse n'y suffit pas seule. Sans ça, une entreprise
  // rentable sous politique "dividend" (100% du profit part en dividende,
  // cf. plus haut) ne voit jamais sa trésorerie grossir organiquement et
  // peut être forcée de licencier ou de laisser tomber sa police
  // d'assurance malgré des comptes dans le vert. Le service de dette
  // (prêts propres de l'entreprise) n'a pas besoin du même traitement : il
  // est déjà déduit AVANT le calcul du profit net (cf. computeCompanyResult,
  // totalLoanPayments dans `costs`), donc déjà financé par construction.
  const companyIncomeByPlayer = new Map<string, number>();
  // Groupe/holding : le dividende d'une part détenue par une AUTRE
  // entreprise (cf. CompanyShare.holderCompany) alimente la trésorerie de
  // cette société-mère (cashReserve, plus bas) plutôt que le patrimoine
  // personnel d'un joueur — il faudra un cycle de plus (via la politique de
  // distribution de la mère) pour qu'il atteigne un joueur, pas de re-boucle
  // dans le même cycle.
  const companyIncomeByHolderCompany = new Map<string, number>();
  // Détail par entreprise (cf. PlayerCycleReportLine) — companyIncomeByPlayer
  // ci-dessus reste le total agrégé consommé partout ailleurs, inchangé.
  const dividendReportLines: {
    playerId: string;
    companyId: string;
    companyName: string;
    grossShare: number;
    tax: number;
    net: number;
  }[] = [];
  const companyReputationByPlayer = new Map<string, number>();
  const liquidationReserveContributionByCompany = new Map<string, number>();
  const operatingReserveRetainedByCompany = new Map<string, number>();
  // Réinvestissement automatique (cf. domain/default-rules.ts) — jusqu'à
  // autoReinvestCapPerCycle du profit POSITIF restant après la rétention
  // ci-dessus est détourné vers le levier choisi AVANT la distribution
  // habituelle (dividende ou réserve), qui ne porte donc plus que sur le
  // reliquat. Aucun effet sur une perte.
  const autoReinvestAmountByCompany = new Map<string, number>();
  for (const result of companyResults) {
    const existingCashReserve = result.company.cashReserve.toNumber();
    const totalPayroll = (companyEmploymentsByCompany.get(result.company.id) ?? []).reduce(
      (sum, e) => sum + e.salary,
      0,
    );
    const insurancePremiumTarget = insurancePolicyByInsuredCompany.get(result.company.id)?.premiumPerCycle.toNumber() ?? 0;
    const operatingReserveTarget = totalPayroll + insurancePremiumTarget;
    const operatingReserveShortfall = Math.max(0, operatingReserveTarget - existingCashReserve);
    const retainedForOperations =
      result.netProfitPerCycle > 0 ? Math.min(result.netProfitPerCycle, operatingReserveShortfall) : 0;
    if (retainedForOperations > 0) {
      operatingReserveRetainedByCompany.set(result.company.id, retainedForOperations);
    }
    const profitAfterRetention = result.netProfitPerCycle - retainedForOperations;

    const axis = result.company.autoReinvestAxis as InvestmentAxis | null;
    const cap = result.company.autoReinvestCapPerCycle?.toNumber() ?? 0;
    const reinvestAmount = axis && cap > 0 && profitAfterRetention > 0 ? Math.min(profitAfterRetention, cap) : 0;
    const distributableProfit = profitAfterRetention - reinvestAmount;
    if (reinvestAmount > 0) {
      autoReinvestAmountByCompany.set(result.company.id, reinvestAmount);
    }

    if (result.company.distributionPolicy === "reserve" && distributableProfit > 0) {
      const { net } = computeLiquidationReserveEntry(distributableProfit);
      liquidationReserveContributionByCompany.set(result.company.id, net);
    } else {
      for (const share of result.company.shares) {
        const shareFraction = share.sharePercentage.toNumber() / 100;
        const grossShare = distributableProfit * shareFraction;
        const { net, tax } = computeDividendDistribution(grossShare);
        if (share.playerId) {
          companyIncomeByPlayer.set(share.playerId, (companyIncomeByPlayer.get(share.playerId) ?? 0) + net);
          if (grossShare !== 0) {
            dividendReportLines.push({
              playerId: share.playerId,
              companyId: result.company.id,
              companyName: result.company.name,
              grossShare,
              tax,
              net,
            });
          }
        } else if (share.holderCompanyId) {
          companyIncomeByHolderCompany.set(
            share.holderCompanyId,
            (companyIncomeByHolderCompany.get(share.holderCompanyId) ?? 0) + net,
          );
        }
      }
    }
    // La réputation générée par l'entreprise revient au propriétaire principal
    // (celui dont l'attention/l'image est engagée), pas répartie aux actionnaires minoritaires.
    if (result.ownerId && result.reputationDelta !== 0) {
      companyReputationByPlayer.set(
        result.ownerId,
        (companyReputationByPlayer.get(result.ownerId) ?? 0) + result.reputationDelta,
      );
    }
  }

  const payrollAffordableByCompany = new Map<string, boolean>();
  for (const [companyId, employments] of companyEmploymentsByCompany) {
    const company = companyById.get(companyId);
    const totalPayroll = employments.reduce((sum, e) => sum + e.salary, 0);
    const boostedCash = (company?.cashReserve.toNumber() ?? 0) + (operatingReserveRetainedByCompany.get(companyId) ?? 0);
    payrollAffordableByCompany.set(companyId, !!company && !bankruptCompanyIds.has(companyId) && boostedCash >= totalPayroll);
  }

  // Assurance inter-joueurs (cf. domain/insurance.ts) — prime prélevée sur
  // la trésorerie de l'assuré chaque cycle (créditée à l'assureur si
  // COMPANY, un vrai coût qui disparaît côté SYSTEM sinon), sur la
  // trésorerie de DÉBUT de cycle augmentée de la rétention automatique
  // ci-dessus (même logique que la masse salariale plus haut — cette prime
  // fait elle-même partie de operatingReserveTarget). Impayée → la police
  // tombe (LAPSED), pas de prélèvement partiel. Sinistre : la perte nette
  // d'un aléa d'entreprise négatif ce cycle (cf. result.eventLossAmount)
  // est indemnisée jusqu'au plafond ET jusqu'à ce que la trésorerie
  // RESTANTE de l'assureur le permette — un assureur-joueur qui encaisse
  // plusieurs sinistres le même cycle peut se retrouver à cours de
  // trésorerie avant la fin (risque de concentration réel, cf. section
  // 12ter), l'assureur système ne l'est jamais.
  const insurancePremiumAffordableByCompany = new Map<string, boolean>();
  for (const policy of insurancePolicies) {
    if (!policy.insuredCompanyId) continue;
    const insured = companyById.get(policy.insuredCompanyId);
    const boostedCash =
      (insured?.cashReserve.toNumber() ?? 0) + (operatingReserveRetainedByCompany.get(policy.insuredCompanyId) ?? 0);
    insurancePremiumAffordableByCompany.set(
      policy.insuredCompanyId,
      !!insured && !bankruptCompanyIds.has(policy.insuredCompanyId) && boostedCash >= policy.premiumPerCycle.toNumber(),
    );
  }
  const insurerPremiumIncomeByCompany = new Map<string, number>();
  for (const policy of insurancePolicies) {
    if (!policy.insuredCompanyId || !policy.insurerCompanyId) continue;
    if (!(insurancePremiumAffordableByCompany.get(policy.insuredCompanyId) ?? false)) continue;
    insurerPremiumIncomeByCompany.set(
      policy.insurerCompanyId,
      (insurerPremiumIncomeByCompany.get(policy.insurerCompanyId) ?? 0) + policy.premiumPerCycle.toNumber(),
    );
  }

  const insuranceClaimPayoutByCompany = new Map<string, number>();
  const insurerClaimDeductionByCompany = new Map<string, number>();
  const insurerRemainingCashById = new Map<string, number>();
  for (const result of companyResults) {
    if (result.eventLossAmount <= 0 || bankruptCompanyIds.has(result.company.id)) continue;
    const policy = insurancePolicyByInsuredCompany.get(result.company.id);
    if (!policy || !(insurancePremiumAffordableByCompany.get(result.company.id) ?? false)) continue;

    const claimAmount = Math.min(result.eventLossAmount, policy.coverageCap.toNumber());
    if (!policy.insurerCompanyId) {
      insuranceClaimPayoutByCompany.set(result.company.id, claimAmount);
      continue;
    }
    const insurer = companyById.get(policy.insurerCompanyId);
    const remaining = insurerRemainingCashById.has(policy.insurerCompanyId)
      ? insurerRemainingCashById.get(policy.insurerCompanyId)!
      : (insurer?.cashReserve.toNumber() ?? 0);
    const payout = Math.max(0, Math.min(claimAmount, remaining));
    insurerRemainingCashById.set(policy.insurerCompanyId, remaining - payout);
    if (payout > 0) {
      insuranceClaimPayoutByCompany.set(result.company.id, payout);
      insurerClaimDeductionByCompany.set(
        policy.insurerCompanyId,
        (insurerClaimDeductionByCompany.get(policy.insurerCompanyId) ?? 0) + payout,
      );
    }
  }

  // Événements marquants du cycle, relayés vers Discord après clôture (cf.
  // apps/api/src/discord — pas de HTTP ici, le moteur de jeu reste pur).
  const noteworthyEvents: string[] = [];

  return prisma.$transaction(async (tx) => {
    if (newSectoralEvent) {
      await tx.sectoralEvent.create({
        data: {
          tier: newSectoralEvent.tier,
          scope: newSectoralEvent.scope,
          regionId: newSectoralEvent.regionId,
          primarySectorId: newSectoralEvent.primarySectorId,
          primaryMagnitude: newSectoralEvent.primaryMagnitude,
          correlatedSectorId: newSectoralEvent.correlatedSectorId,
          correlatedMagnitude: newSectoralEvent.correlatedMagnitude,
          createdCycle: openCycle.number,
          startCycle: newSectoralEvent.startCycle,
          endCycle: newSectoralEvent.endCycle,
        },
      });

      const primaryName = sectorById.get(newSectoralEvent.primarySectorId)?.name ?? "un secteur";
      const regionName = newSectoralEvent.regionId ? regionById.get(newSectoralEvent.regionId)?.name : null;
      const geo = regionName ? ` (${regionName})` : " (à l'échelle nationale)";

      if (newSectoralEvent.tier === "MAJOR") {
        // Signal faible, sans certitude de sens ni d'ampleur (cf. section
        // 12ter) — récompense l'attention sans donner de certitude
        // exploitable : le secteur est nommé, pas la direction ni la magnitude.
        const headline = `Signaux de tension dans le secteur ${primaryName}${geo} — un choc économique pourrait survenir dans les prochains cycles.`;
        await tx.pressArticle.create({
          data: { category: "SECTORAL_SHOCK_WARNING", headline, cycle: openCycle.number },
        });
        noteworthyEvents.push(`⚠️ ${headline}`);
      } else if (newSectoralEvent.tier === "EXCEPTIONAL") {
        // Cygne noir : zéro signal par définition, l'impact et le titre de
        // presse tombent le même cycle.
        const sign = newSectoralEvent.primaryMagnitude > 0 ? "boom" : "krach";
        const headline = `Choc économique exceptionnel : ${sign} soudain sur le secteur ${primaryName}${geo}.`;
        await tx.pressArticle.create({
          data: { category: "SECTORAL_SHOCK", headline, cycle: openCycle.number },
        });
        noteworthyEvents.push(`🚨 ${headline}`);
      }
    }

    for (const event of sectoralEventsStartingNow) {
      const primaryName = sectorById.get(event.primarySectorId)?.name ?? "un secteur";
      const regionName = event.regionId ? regionById.get(event.regionId)?.name : null;
      const geo = regionName ? ` (${regionName})` : " (à l'échelle nationale)";
      const sign = event.primaryMagnitude.toNumber() > 0 ? "boom" : "krach";
      const headline = `Le choc annoncé se confirme : ${sign} sur le secteur ${primaryName}${geo}.`;
      await tx.pressArticle.create({
        data: { category: "SECTORAL_SHOCK", headline, cycle: openCycle.number },
      });
      noteworthyEvents.push(`🚨 ${headline}`);
      await tx.sectoralEvent.update({ where: { id: event.id }, data: { impactPublishedCycle: openCycle.number } });
    }

    if (b2bMatchesWithSector.length > 0) {
      await tx.supplyContract.createMany({
        data: b2bMatchesWithSector.map((match) => ({
          buyerCompanyId: match.buyerCompanyId,
          sellerCompanyId: match.sellerCompanyId,
          sectorId: match.sectorId,
          quantity: match.quantity,
          price: match.price,
          cycleId: openCycle.id,
        })),
      });
    }

    for (const result of companyResults) {
      await tx.companyCycleReport.upsert({
        where: { companyId_cycleId: { companyId: result.company.id, cycleId: openCycle.id } },
        create: {
          companyId: result.company.id,
          cycleId: openCycle.id,
          revenue: result.revenue,
          costs: result.costs,
          profit: result.profitPerCycle,
          taxPaid: result.taxPerCycle,
          eventLabel: result.eventLabel,
          unitsProduced: result.unitsProduced,
          unitsSold: result.unitsSold,
          unitsLost: result.unitsLostDemand,
          stockUnits: result.stockUnitsTotal,
        },
        update: {
          revenue: result.revenue,
          costs: result.costs,
          profit: result.profitPerCycle,
          taxPaid: result.taxPerCycle,
          eventLabel: result.eventLabel,
          unitsProduced: result.unitsProduced,
          unitsSold: result.unitsSold,
          unitsLost: result.unitsLostDemand,
          stockUnits: result.stockUnitsTotal,
        },
      });

      const communityLoanCredit = communityLoanCreditByLenderCompany.get(result.company.id) ?? 0;
      const liquidationReserveContribution = liquidationReserveContributionByCompany.get(result.company.id) ?? 0;
      const depositInterestPaid = depositInterestPaidByCompany.get(result.company.id) ?? 0;
      const guildFine = guildFineByCompany.get(result.company.id) ?? 0;
      const companyEmployments = companyEmploymentsByCompany.get(result.company.id) ?? [];
      const payrollAffordable = payrollAffordableByCompany.get(result.company.id) ?? true;
      const payrollCost = payrollAffordable ? companyEmployments.reduce((sum, e) => sum + e.salary, 0) : 0;
      const insurancePolicy = insurancePolicyByInsuredCompany.get(result.company.id);
      const insurancePremiumAffordable = insurancePremiumAffordableByCompany.get(result.company.id) ?? false;
      const insurancePremiumCost = insurancePolicy && insurancePremiumAffordable ? insurancePolicy.premiumPerCycle.toNumber() : 0;
      const insurancePremiumIncome = insurerPremiumIncomeByCompany.get(result.company.id) ?? 0;
      const insuranceClaimReceived = insuranceClaimPayoutByCompany.get(result.company.id) ?? 0;
      const insuranceClaimPaidOut = insurerClaimDeductionByCompany.get(result.company.id) ?? 0;
      const autoReinvestAmount = autoReinvestAmountByCompany.get(result.company.id) ?? 0;
      const autoReinvestAxis = result.company.autoReinvestAxis as InvestmentAxis | null;
      const autoReinvestField = autoReinvestAxis ? AUTO_REINVEST_FIELD_BY_AXIS[autoReinvestAxis] : null;
      const operatingReserveRetained = operatingReserveRetainedByCompany.get(result.company.id) ?? 0;
      const subsidiaryDividendsReceived = companyIncomeByHolderCompany.get(result.company.id) ?? 0;
      await tx.company.update({
        where: { id: result.company.id },
        data: {
          cumulativeNetProfit: { increment: result.netProfitPerCycle },
          cashReserve: {
            increment:
              operatingReserveRetained +
              communityLoanCredit -
              result.reserveConsumed -
              depositInterestPaid -
              guildFine -
              payrollCost -
              insurancePremiumCost +
              insurancePremiumIncome +
              insuranceClaimReceived -
              insuranceClaimPaidOut +
              subsidiaryDividendsReceived +
              (autoReinvestField === "cashReserve" ? autoReinvestAmount : 0),
          },
          ...(autoReinvestAmount > 0 && autoReinvestField && autoReinvestField !== "cashReserve"
            ? { [autoReinvestField]: { increment: autoReinvestAmount } }
            : {}),
          equipmentAccumulatedDepreciation: { increment: result.depreciationExpense },
          ...(liquidationReserveContribution > 0
            ? {
                liquidationReserve: { increment: liquidationReserveContribution },
                ...(result.company.liquidationReserveSinceCycle === null
                  ? { liquidationReserveSinceCycle: openCycle.number }
                  : {}),
              }
            : {}),
          ...(result.attractivenessScoreAfterDefault !== null
            ? { attractivenessScore: result.attractivenessScoreAfterDefault }
            : {}),
          ...(result.isBankrupt ? { status: "BANKRUPT" as const } : {}),
        },
      });

      for (const loanUpdate of result.loanUpdates) {
        await tx.companyLoan.update({
          where: { id: loanUpdate.loan.id },
          data: { remainingBalance: loanUpdate.remainingBalance, status: loanUpdate.status },
        });
      }

      if (result.eventLabel && result.ownerId) {
        await tx.playerNotification.create({
          data: {
            playerId: result.ownerId,
            type: "company-event",
            message: `${result.company.name} — ${result.eventLabel}`,
            cycle: openCycle.number,
          },
        });
      }

      if (result.defaultedThisCycle && !result.isBankrupt && result.ownerId) {
        await tx.playerNotification.create({
          data: {
            playerId: result.ownerId,
            type: "company-loan-default",
            message: `Un prêt bancaire de ${result.company.name} est passé en défaut de paiement.`,
            cycle: openCycle.number,
          },
        });
      }

      if (result.isBankrupt && result.ownerId) {
        await tx.playerNotification.create({
          data: {
            playerId: result.ownerId,
            type: "company-bankrupt",
            message: `${result.company.name} a fait faillite — pertes cumulées trop lourdes, prêts effacés, l'entreprise cesse son activité.`,
            cycle: openCycle.number,
          },
        });
      }
      if (result.isBankrupt) {
        const headline = `${result.company.name} a fait faillite — pertes cumulées trop lourdes, l'entreprise cesse son activité.`;
        await tx.pressArticle.create({
          data: { category: "BANKRUPTCY", headline, cycle: openCycle.number },
        });
        noteworthyEvents.push(`💥 ${headline}`);
      }

      if (companyEmployments.length > 0 && (!payrollAffordable || result.isBankrupt)) {
        await tx.employment.updateMany({
          where: { id: { in: companyEmployments.map((e) => e.employmentId) } },
          data: { endedCycle: openCycle.number },
        });
        await tx.companyJobPosting.updateMany({
          where: { companyId: result.company.id, status: "FILLED" },
          data: { status: result.isBankrupt ? "CLOSED" : "OPEN" },
        });
        for (const e of companyEmployments) {
          await tx.playerNotification.create({
            data: {
              playerId: e.playerId,
              type: "job-lost",
              message: result.isBankrupt
                ? `${result.company.name} a fait faillite — tu as perdu ton poste "${e.role}".`
                : `${result.company.name} n'a pas pu payer les salaires ce cycle-ci — tu as perdu ton poste "${e.role}".`,
              cycle: openCycle.number,
            },
          });
        }
      }

      if (insurancePolicy && !insurancePremiumAffordable) {
        await tx.insurancePolicy.update({ where: { id: insurancePolicy.id }, data: { status: "LAPSED" } });
        if (result.ownerId) {
          await tx.playerNotification.create({
            data: {
              playerId: result.ownerId,
              type: "insurance-lapsed",
              message: `${result.company.name} n'a pas pu payer sa prime d'assurance ce cycle-ci — la police est résiliée.`,
              cycle: openCycle.number,
            },
          });
        }
      }
      if (insuranceClaimReceived > 0 && result.ownerId) {
        await tx.playerNotification.create({
          data: {
            playerId: result.ownerId,
            type: "insurance-claim-paid",
            message: `${result.company.name} a touché ${insuranceClaimReceived.toFixed(0)} € de son assurance suite à un sinistre.`,
            cycle: openCycle.number,
          },
        });
      }
      if (insuranceClaimPaidOut > 0 && result.ownerId) {
        await tx.playerNotification.create({
          data: {
            playerId: result.ownerId,
            type: "insurance-payout-made",
            message: `${result.company.name} a versé ${insuranceClaimPaidOut.toFixed(0)} € à un assuré suite à un sinistre.`,
            cycle: openCycle.number,
          },
        });
      }

      for (const departmentUpdate of result.departmentUpdates) {
        await tx.companyDepartment.upsert({
          where: { companyId_department: { companyId: result.company.id, department: departmentUpdate.department } },
          create: {
            companyId: result.company.id,
            department: departmentUpdate.department,
            hasManager: departmentUpdate.hasManager,
            morale: departmentUpdate.newMorale,
          },
          update: { morale: departmentUpdate.newMorale },
        });
      }

      for (const productResult of result.productResults) {
        await tx.companyProduct.update({
          where: { id: productResult.product.id },
          data: { stockUnits: productResult.stockUnitsAfter },
        });

        await tx.productCycleReport.upsert({
          where: { productId_cycleId: { productId: productResult.product.id, cycleId: openCycle.id } },
          create: {
            productId: productResult.product.id,
            cycleId: openCycle.id,
            unitsProduced: productResult.unitsProduced,
            unitsSold: productResult.unitsSold,
            unitsLost: productResult.unitsLostDemand,
            stockUnits: productResult.stockUnitsAfter,
            unitPrice: productResult.unitPrice,
            unitCost: productResult.unitCost,
            revenue: productResult.revenue,
            marketSharePercent: productResult.marketSharePercent,
          },
          update: {
            unitsProduced: productResult.unitsProduced,
            unitsSold: productResult.unitsSold,
            unitsLost: productResult.unitsLostDemand,
            stockUnits: productResult.stockUnitsAfter,
            unitPrice: productResult.unitPrice,
            unitCost: productResult.unitCost,
            revenue: productResult.revenue,
            marketSharePercent: productResult.marketSharePercent,
          },
        });
      }
    }

    let payrollCount = 0;

    for (const player of players) {
      const stats = player.stats;
      if (!stats) continue;

      const employment = player.employments[0];
      const job = employment?.jobId ? NPC_JOBS[employment.jobId as JobId] : undefined;
      // Employeur d'autres joueurs (cf. domain/player-employment.ts) : un
      // employment COMPANY dont l'employeur n'a pas pu payer ce cycle (ou a
      // fait faillite) a déjà été terminé plus haut (endedCycle) — on ne le
      // traite pas comme actif ici même si l'objet en mémoire est encore
      // celui d'avant la transaction.
      const companyEmployerId = employment?.employerType === "COMPANY" ? employment.companyId : null;
      const companyJobActive =
        !!companyEmployerId &&
        (payrollAffordableByCompany.get(companyEmployerId) ?? false) &&
        !bankruptCompanyIds.has(companyEmployerId);
      const companySector = companyJobActive
        ? sectorById.get(companyById.get(companyEmployerId!)?.sectorId ?? "")?.name
        : undefined;
      const effectiveSector = job?.sector ?? companySector;
      const effectivePressure = job?.pressure ?? employment?.pressure ?? undefined;
      const hasActiveJob = !!job || companyJobActive;
      const sectorCycles = effectiveSector
        ? (player.sectorExperience.find((entry) => entry.sector === effectiveSector)?.cycles ?? 0)
        : 0;

      const sportLevel = computePersonalInvestmentLevel(stats.sportInvestment.toNumber());
      const nutritionLevel = computePersonalInvestmentLevel(stats.nutritionInvestment.toNumber());
      const socialLevel = computePersonalInvestmentLevel(stats.socialInvestment.toNumber());
      const comfortLevel = computePersonalInvestmentLevel(stats.comfortInvestment.toNumber());

      // Biens de consommation personnels : bonus de bien-être passif tant
      // que le bien est détenu, cumulable entre plusieurs biens (cf.
      // domain/personal-goods.ts) — la valeur résiduelle (dépréciation
      // exponentielle) alimente le patrimoine total plus bas.
      let personalGoodsValueThisPlayer = 0;
      let personalGoodsWellbeingBonus = 0;
      let ownsVehicle = false;
      for (const good of personalGoodsByPlayer.get(player.id) ?? []) {
        const definition = PERSONAL_GOOD_CATALOG[good.goodId as PersonalGoodId];
        if (!definition) continue;
        if (definition.category === "vehicule") ownsVehicle = true;
        personalGoodsWellbeingBonus += definition.wellbeingBonusPerCycle;
        personalGoodsValueThisPlayer += computePersonalGoodValue(
          good.purchasePrice.toNumber(),
          definition.depreciationRatePerCycle,
          openCycle.number - good.purchasedCycle,
        );
      }

      // Récap "revenus & dépenses" du cycle (cf. PlayerCycleReport, affiché
      // sur /portefeuille) — mêmes montants que ceux ajoutés à wealthDelta
      // ci-dessous, gardés à part catégorie par catégorie plutôt que
      // fondus dans un seul total, pour que le joueur comprenne d'où vient
      // chaque euro gagné ou perdu ce cycle.
      const dividendIncome = companyIncomeByPlayer.get(player.id) ?? 0;
      const rentIncome = rentIncomeByPlayer.get(player.id) ?? 0;
      const mortgagePayment = mortgagePaymentAmountByPlayer.get(player.id) ?? 0;
      let salaryIncome = 0;
      let independentActivityIncome = 0;
      let lifeEventDelta = 0;
      let assetDividendCashIncome = 0;
      let assetDividendReinvestedValue = 0;

      let wealthDelta = dividendIncome + (propertyWealthDeltaByPlayer.get(player.id) ?? 0);
      let wellbeingDelta =
        computeBaselineWellbeingRegen(sportLevel) +
        personalGoodsWellbeingBonus -
        computeUnmanagedCompanyWellbeingDrain(unmanagedActiveCompanyCountByOwner.get(player.id) ?? 0);
      let reputationDelta =
        (companyReputationByPlayer.get(player.id) ?? 0) - (guildReputationPenaltyByOwner.get(player.id) ?? 0);
      let experienceDelta = 0;

      // Événements de vie aléatoires — le pendant personnel des aléas
      // d'entreprise, cf. domain/personal-events.ts.
      const lifeEvent = rollPersonalLifeEvent(ownsVehicle);
      if (lifeEvent) {
        lifeEventDelta = lifeEvent.wealthDelta;
        wealthDelta += lifeEvent.wealthDelta;
        wellbeingDelta += lifeEvent.wellbeingDelta;
        reputationDelta += lifeEvent.reputationDelta;
        await tx.playerNotification.create({
          data: {
            playerId: player.id,
            type: lifeEvent.isPositive ? "life-event-positive" : "life-event-negative",
            message:
              lifeEvent.wealthDelta !== 0
                ? `${lifeEvent.label} (${lifeEvent.wealthDelta > 0 ? "+" : ""}${lifeEvent.wealthDelta.toFixed(0)} €)`
                : lifeEvent.label,
            cycle: openCycle.number,
          },
        });
      }

      if (employment && hasActiveJob) {
        const incomeMultiplier = computeWellbeingIncomeMultiplier(stats.wellbeing.toNumber(), socialLevel, comfortLevel);
        const careerTier = getCareerTier(sectorCycles);
        const annualGross = employment.salary.toNumber() * CYCLES_PER_YEAR * careerTier.salaryMultiplier;
        const independentActivity = independentActivityByPlayer.get(player.id);

        if (independentActivity) {
          // Indépendant complémentaire : le revenu annexe s'agrège au
          // salaire pour l'IPP (même barème progressif, pas un forfait à
          // part) — cf. domain/independent-activity.ts. Le multiplicateur
          // bien-être ne s'applique qu'à la part salariale du net combiné.
          const salaryNetTaxable = applySocialContributions(annualGross, ipp);
          const sideAnnualGrossRevenue = independentActivity.grossRevenuePerCycle.toNumber() * CYCLES_PER_YEAR;
          const sideSocialContributions = calculateSelfEmployedContributions(
            sideAnnualGrossRevenue,
            selfEmployed.brackets,
          );
          const sideNetTaxable = sideAnnualGrossRevenue - sideSocialContributions;
          const totalTaxable = salaryNetTaxable + sideNetTaxable;
          const { totalTax } = calculateIpp(totalTaxable, ipp, DEFAULT_COMMUNAL_SURCHARGE_RATE);
          const totalNet = totalTaxable - totalTax;
          const salaryShare = totalTaxable > 0 ? salaryNetTaxable / totalTaxable : 0;
          salaryIncome = ((totalNet * salaryShare) / CYCLES_PER_YEAR) * incomeMultiplier;
          independentActivityIncome = (totalNet * (1 - salaryShare)) / CYCLES_PER_YEAR;
          wealthDelta += salaryIncome + independentActivityIncome;
          wellbeingDelta -= computeIndependentActivityWellbeingDrain(independentActivity.grossRevenuePerCycle.toNumber());
        } else {
          const { netAnnualIncome } = calculateNetAnnualIncome(annualGross, ipp, DEFAULT_COMMUNAL_SURCHARGE_RATE);
          salaryIncome = (netAnnualIncome / CYCLES_PER_YEAR) * incomeMultiplier;
          wealthDelta += salaryIncome;
        }

        wellbeingDelta -= computePressureDrain(effectivePressure ?? 50, sectorCycles, nutritionLevel);
        reputationDelta += job?.reputationPerCycle ?? 0;
        experienceDelta = 1;

        if (effectiveSector) {
          await tx.playerSectorExperience.upsert({
            where: { playerId_sector: { playerId: player.id, sector: effectiveSector } },
            create: { playerId: player.id, sector: effectiveSector, cycles: 1 },
            update: { cycles: { increment: 1 } },
          });

          const newTier = getCareerTier(sectorCycles + 1).tier;
          if (newTier.id !== careerTier.tier.id) {
            await tx.playerNotification.create({
              data: {
                playerId: player.id,
                type: "career-promotion",
                message: `Palier de carrière atteint dans le secteur ${effectiveSector} : ${newTier.label} (salaire +${((newTier.salaryMultiplier - 1) * 100).toFixed(0)}%).`,
                cycle: openCycle.number,
              },
            });
          }
        }

        payrollCount += 1;
      }

      // Prêts hypothécaires : défaut de paiement vérifié une fois le
      // patrimoine liquide de ce cycle connu (comme pour les prêts
      // d'entreprise) — mêmes pertes cumulées que ce qu'il reste à
      // rembourser = saisie du bien mis en garantie (cf. domain/mortgage.ts).
      const projectedWealth = stats.wealthLiquid.toNumber() + wealthDelta;
      for (const { loan, principalPortion, interest, totalPayment } of mortgagePaymentsByPlayer.get(player.id) ?? []) {
        const remainingAfterPayment = loan.remainingBalance.toNumber() - principalPortion;

        await tx.playerCycleReportLine.upsert({
          where: {
            playerId_cycleId_category_sourceId: {
              playerId: player.id,
              cycleId: openCycle.id,
              category: "mortgage",
              sourceId: loan.id,
            },
          },
          create: {
            playerId: player.id,
            cycleId: openCycle.id,
            category: "mortgage",
            sourceId: loan.id,
            label: loan.collateralProperty
              ? `Prêt hypothécaire — ${loan.collateralProperty.customName ?? "bien immobilier"}`
              : `Prêt communautaire — ${loan.lenderCompany?.name ?? "entreprise"}`,
            grossAmount: interest,
            taxAmount: null,
            netAmount: -totalPayment,
          },
          update: { netAmount: -totalPayment, grossAmount: interest },
        });

        if (remainingAfterPayment <= 0.01) {
          await tx.loan.update({ where: { id: loan.id }, data: { remainingBalance: 0, status: "PAID" } });
          continue;
        }

        if (projectedWealth < -remainingAfterPayment) {
          await tx.loan.update({ where: { id: loan.id }, data: { remainingBalance: 0, status: "DEFAULTED" } });
          const isCommunityLoan = loan.lenderType === "COMPANY";
          reputationDelta -= isCommunityLoan ? COMMUNITY_LOAN_DEFAULT_REPUTATION_PENALTY : FORECLOSURE_REPUTATION_PENALTY;

          if (loan.collateralProperty) {
            await tx.lease.updateMany({
              where: { propertyId: loan.collateralProperty.id, status: "ACTIVE" },
              data: { status: "ENDED", endedCycle: openCycle.number },
            });
            await tx.property.update({
              where: { id: loan.collateralProperty.id },
              data: { ownerId: null, status: "VACANT" },
            });
            await tx.listing.create({
              data: {
                propertyId: loan.collateralProperty.id,
                price: loan.collateralProperty.marketValue.toNumber() * FORECLOSURE_SALE_RATIO,
                isAuction: false,
                expiresAt: new Date("2099-01-01"),
              },
            });
            await tx.playerNotification.create({
              data: {
                playerId: player.id,
                type: "mortgage-default",
                message: `Ton prêt hypothécaire est en défaut de paiement — le bien mis en garantie a été saisi et remis en vente.`,
                cycle: openCycle.number,
              },
            });
          } else if (isCommunityLoan) {
            await tx.playerNotification.create({
              data: {
                playerId: player.id,
                type: "community-loan-default",
                message: `Ton prêt de ${loan.principal.toNumber().toFixed(0)} € auprès de ${loan.lenderCompany?.name ?? "une entreprise"} est en défaut de paiement.`,
                cycle: openCycle.number,
              },
            });
          }
          continue;
        }

        await tx.loan.update({ where: { id: loan.id }, data: { remainingBalance: remainingAfterPayment } });
      }

      // Épargne : intérêt composé par cycle, taxé au taux plus-values
      // au-delà de la franchise à vie restante du joueur (sauf pension,
      // exonérée) — cf. domain/savings.ts. La franchise se consomme au fil
      // des comptes traités dans ce même cycle (ordre arbitraire).
      let taxableGrossInterestThisCycle = 0;
      let savingsValueThisPlayer = 0;
      let savingsInterestAccrued = 0;
      let exemptionRemaining = capitalGains.exemption - stats.cumulativeInvestmentGains.toNumber();
      for (const account of savingsAccountsByPlayer.get(player.id) ?? []) {
        const isTaxExempt = account.productType === "pension";
        const balance = account.balance.toNumber();
        const { grossInterest, netInterest } = computeSavingsInterest(
          balance,
          account.rate.toNumber(),
          isTaxExempt,
          exemptionRemaining,
          capitalGains.rate,
        );
        if (!isTaxExempt) {
          taxableGrossInterestThisCycle += grossInterest;
          exemptionRemaining -= grossInterest;
        }
        savingsInterestAccrued += netInterest;
        const newBalance = balance + netInterest;
        savingsValueThisPlayer += newBalance;
        await tx.savingsAccount.update({ where: { id: account.id }, data: { balance: newBalance } });

        if (account.termCycles > 0 && account.openedCycle + account.termCycles === openCycle.number) {
          await tx.playerNotification.create({
            data: {
              playerId: player.id,
              type: "savings-matured",
              message: `${SAVINGS_PRODUCT_LABELS[account.productType as SavingsProductType]} arrivé à échéance — retrait sans pénalité désormais possible.`,
              cycle: openCycle.number,
            },
          });
        }
      }

      // Dividendes d'actions détenues (cf. domain/financial-assets.ts
      // dividendRate, game-engine/financial-assets.ts computeAssetDividend)
      // — même franchise à vie partagée que l'épargne ci-dessus, poursuivie
      // sans être réinitialisée. CASH crédite le patrimoine liquide,
      // REINVEST achète davantage de parts au prix courant (effet boule de
      // neige pour qui reste investi).
      let taxableGrossDividendThisCycle = 0;
      for (const holding of assetHoldingsByPlayer.get(player.id) ?? []) {
        const definition = FINANCIAL_ASSET_CATALOG[assetById.get(holding.assetId)?.key ?? ""];
        if (!definition || definition.dividendRate <= 0) continue;

        const quantity = holding.quantity.toNumber();
        const price = nextAssetPriceById.get(holding.assetId) ?? 0;
        const { grossDividend, netDividend } = computeAssetDividend(
          quantity,
          price,
          definition.dividendRate,
          exemptionRemaining,
          capitalGains.rate,
        );
        if (grossDividend <= 0) continue;
        taxableGrossDividendThisCycle += grossDividend;
        exemptionRemaining -= grossDividend;

        if (holding.dividendPolicy === "REINVEST" && price > 0) {
          await tx.playerAssetHolding.update({
            where: { playerId_assetId: { playerId: player.id, assetId: holding.assetId } },
            data: { quantity: { increment: netDividend / price }, costBasis: { increment: netDividend } },
          });
          assetDividendReinvestedValue += netDividend;
        } else {
          assetDividendCashIncome += netDividend;
          wealthDelta += netDividend;
        }
      }

      const netWorth =
        projectedWealth +
        (propertyEquityByPlayer.get(player.id) ?? 0) +
        (companyEquityByPlayer.get(player.id) ?? 0) +
        (commodityValueByPlayer.get(player.id) ?? 0) +
        savingsValueThisPlayer +
        personalGoodsValueThisPlayer;

      const updatedStats = await tx.playerStats.update({
        where: { playerId: player.id },
        data: {
          wealthLiquid: { increment: wealthDelta },
          wealthDisplayed: { increment: wealthDelta },
          wellbeing: clampStat(stats.wellbeing.toNumber() + wellbeingDelta),
          reputation: clampStat(stats.reputation.toNumber() + reputationDelta),
          experience: { increment: experienceDelta },
          netWorth,
          cumulativeInvestmentGains: { increment: taxableGrossInterestThisCycle + taxableGrossDividendThisCycle },
        },
      });

      await tx.playerStatHistory.upsert({
        where: { playerId_cycleId: { playerId: player.id, cycleId: openCycle.id } },
        create: {
          playerId: player.id,
          cycleId: openCycle.id,
          wealth: updatedStats.wealthLiquid,
          reputation: updatedStats.reputation,
          experience: updatedStats.experience,
          wellbeing: updatedStats.wellbeing,
          netWorth: updatedStats.netWorth,
        },
        update: {
          wealth: updatedStats.wealthLiquid,
          reputation: updatedStats.reputation,
          experience: updatedStats.experience,
          wellbeing: updatedStats.wellbeing,
          netWorth: updatedStats.netWorth,
        },
      });

      // Récap détaillé du cycle (cf. apps/web/app/portefeuille) — une ligne
      // par joueur par cycle, mise à jour plus bas par les jalons de
      // progression (achievementReward) et les faillites bancaires
      // (bankFailurePayout), qui se produisent après cette boucle.
      await tx.playerCycleReport.upsert({
        where: { playerId_cycleId: { playerId: player.id, cycleId: openCycle.id } },
        create: {
          playerId: player.id,
          cycleId: openCycle.id,
          salaryIncome,
          independentActivityIncome,
          dividendIncome,
          rentIncome,
          mortgagePayment,
          lifeEventDelta,
          assetDividendCashIncome,
          assetDividendReinvestedValue,
          savingsInterestAccrued,
        },
        update: {
          salaryIncome,
          independentActivityIncome,
          dividendIncome,
          rentIncome,
          mortgagePayment,
          lifeEventDelta,
          assetDividendCashIncome,
          assetDividendReinvestedValue,
          savingsInterestAccrued,
        },
      });

      // Jalons de progression moyen terme (audit d'équilibrage, cf.
      // domain/achievements.ts) — mêmes trois pistes que le catalogue
      // décrit : patrimoine net, profit d'entreprise, niveau de levier
      // (entreprise OU personnel, le plus haut des deux). Un gros bond en un
      // seul cycle peut débloquer plusieurs paliers d'une même piste à la
      // fois — comportement voulu, chaque palier reste sa propre récompense.
      const alreadyUnlocked = unlockedAchievementsByPlayer.get(player.id) ?? new Set<string>();
      const maxPersonalLevel = Math.max(sportLevel, nutritionLevel, socialLevel, comfortLevel);
      const maxLeverLevel = Math.max(maxInvestmentLevelByOwner.get(player.id) ?? 0, maxPersonalLevel);
      const milestoneChecks: { value: number; milestones: AchievementMilestone[] }[] = [
        { value: updatedStats.netWorth.toNumber(), milestones: NET_WORTH_MILESTONES },
        { value: maxCompanyProfitByOwner.get(player.id) ?? -Infinity, milestones: COMPANY_PROFIT_MILESTONES },
        { value: maxLeverLevel, milestones: INVESTMENT_LEVEL_MILESTONES },
      ];
      for (const { value, milestones } of milestoneChecks) {
        for (const milestone of milestones) {
          if (value < milestone.threshold || alreadyUnlocked.has(milestone.id)) continue;
          const definition = ACHIEVEMENT_CATALOG[milestone.id];
          alreadyUnlocked.add(milestone.id);
          await tx.playerAchievement.create({ data: { playerId: player.id, achievementId: milestone.id } });
          await tx.playerStats.update({
            where: { playerId: player.id },
            data: { wealthLiquid: { increment: definition.reward } },
          });
          await tx.playerCycleReport.update({
            where: { playerId_cycleId: { playerId: player.id, cycleId: openCycle.id } },
            data: { achievementReward: { increment: definition.reward } },
          });
          await tx.playerCycleReportLine.upsert({
            where: {
              playerId_cycleId_category_sourceId: {
                playerId: player.id,
                cycleId: openCycle.id,
                category: "achievement",
                sourceId: milestone.id,
              },
            },
            create: {
              playerId: player.id,
              cycleId: openCycle.id,
              category: "achievement",
              sourceId: milestone.id,
              label: definition.label,
              netAmount: definition.reward,
            },
            update: { netAmount: definition.reward },
          });
          await tx.playerNotification.create({
            data: {
              playerId: player.id,
              type: "achievement-unlocked",
              message: `Défi débloqué : ${definition.label} (+${definition.reward.toFixed(0)} €)`,
              cycle: openCycle.number,
            },
          });
          noteworthyEvents.push(`🏅 ${player.pseudo} a débloqué : ${definition.label}`);
        }
      }
    }

    for (const update of commodityMarketUpdates) {
      await tx.commodityMarket.update({
        where: { id: update.market.id },
        data: { commodityReserve: update.commodityReserve, cashReserve: update.cashReserve },
      });

      await tx.commodityPriceHistory.upsert({
        where: { marketId_cycleId: { marketId: update.market.id, cycleId: openCycle.id } },
        create: { marketId: update.market.id, cycleId: openCycle.id, price: update.price },
        update: { price: update.price },
      });
    }

    for (const update of propertyUpdates) {
      await tx.property.update({
        where: { id: update.property.id },
        data: { condition: update.newCondition },
      });

      if (update.rentCollected > 0) {
        await tx.playerCycleReportLine.upsert({
          where: {
            playerId_cycleId_category_sourceId: {
              playerId: update.ownerId,
              cycleId: openCycle.id,
              category: "rent",
              sourceId: update.property.id,
            },
          },
          create: {
            playerId: update.ownerId,
            cycleId: openCycle.id,
            category: "rent",
            sourceId: update.property.id,
            label: update.property.customName ?? update.property.municipality.name,
            netAmount: update.rentCollected,
          },
          update: { netAmount: update.rentCollected },
        });
      }
    }

    for (const line of dividendReportLines) {
      await tx.playerCycleReportLine.upsert({
        where: {
          playerId_cycleId_category_sourceId: {
            playerId: line.playerId,
            cycleId: openCycle.id,
            category: "dividend",
            sourceId: line.companyId,
          },
        },
        create: {
          playerId: line.playerId,
          cycleId: openCycle.id,
          category: "dividend",
          sourceId: line.companyId,
          label: line.companyName,
          grossAmount: line.grossShare,
          taxAmount: line.tax,
          netAmount: line.net,
        },
        update: { label: line.companyName, grossAmount: line.grossShare, taxAmount: line.tax, netAmount: line.net },
      });
    }

    for (const update of financialAssetUpdates) {
      await tx.financialAsset.update({
        where: { id: update.asset.id },
        data: { price: update.nextPrice, previousPrice: update.previousPrice },
      });

      await tx.financialAssetPriceHistory.upsert({
        where: { assetId_cycleId: { assetId: update.asset.id, cycleId: openCycle.id } },
        create: { assetId: update.asset.id, cycleId: openCycle.id, price: update.nextPrice },
        update: { price: update.nextPrice },
      });
    }

    for (const update of bankDepositUpdates) {
      await tx.bankDeposit.update({
        where: { id: update.deposit.id },
        data: { balance: { increment: update.netInterest } },
      });
    }

    // Banques-joueurs : défaut en cascade (cf. domain/banking.ts) — après
    // tous les défauts de ce cycle, une banque dont les fonds propres sont
    // devenus trop négatifs par rapport à ses dépôts fait faillite comme
    // n'importe quelle entreprise (mêmes conséquences que la faillite
    // classique ci-dessus). Nécessite une requête fraîche : les défauts de
    // prêts communautaires traités plus haut dans cette même transaction
    // doivent déjà être reflétés (loansAsLender), ce que le snapshot
    // `companies` chargé en tout début de fonction ne peut pas voir.
    const banksWithActiveDeposits = await tx.company.findMany({
      where: { status: "ACTIVE", deposits: { some: { withdrawnCycle: null } } },
      include: {
        products: true,
        loans: { where: { status: "ACTIVE" } },
        loansAsLender: { where: { status: "ACTIVE" } },
        deposits: { where: { withdrawnCycle: null } },
      },
    });
    for (const bank of banksWithActiveDeposits) {
      const totalDeposits = bank.deposits.reduce((sum, d) => sum + d.balance.toNumber(), 0);
      if (totalDeposits <= 0) continue;
      const { equity } = assembleCompanyBalanceSheet(bank);
      if (equity / totalDeposits >= BANK_INSOLVENCY_EQUITY_RATIO_THRESHOLD) continue;

      await tx.loan.updateMany({
        where: { id: { in: bank.loans.map((l) => l.id) } },
        data: { remainingBalance: 0, status: "DEFAULTED" },
      });
      await tx.company.update({ where: { id: bank.id }, data: { status: "BANKRUPT" } });

      const ownerId = primaryOwnerIdByCompany.get(bank.id);
      if (ownerId) {
        const ownerStats = await tx.playerStats.findUnique({ where: { playerId: ownerId } });
        if (ownerStats) {
          await tx.playerStats.update({
            where: { playerId: ownerId },
            data: { reputation: clampStat(ownerStats.reputation.toNumber() - COMPANY_BANKRUPTCY_REPUTATION_PENALTY) },
          });
        }
        await tx.playerNotification.create({
          data: {
            playerId: ownerId,
            type: "company-bankrupt",
            message: `${bank.name} a fait faillite — une vague de défauts de paiement a emporté ses fonds propres, ses dépôts vont être liquidés.`,
            cycle: openCycle.number,
          },
        });
      }
      await tx.pressArticle.create({
        data: {
          category: "BANKRUPTCY",
          headline: `${bank.name} a fait faillite — une vague de défauts de paiement a emporté ses fonds propres.`,
          cycle: openCycle.number,
        },
      });
    }

    // Liquidation des dépôts de toute entreprise en faillite (fraîchement
    // ci-dessus, via la faillite classique plus haut dans cette même
    // transaction, ou héritée d'un cycle précédent jamais nettoyé) — soldés
    // au prorata de ce qu'il reste en trésorerie, une vraie perte possible
    // pour le déposant plutôt qu'un simple retrait différé.
    const bankruptCompaniesWithDeposits = await tx.company.findMany({
      where: { status: "BANKRUPT", deposits: { some: { withdrawnCycle: null } } },
      include: { deposits: { where: { withdrawnCycle: null } } },
    });
    for (const bank of bankruptCompaniesWithDeposits) {
      const totalDeposits = bank.deposits.reduce((sum, d) => sum + d.balance.toNumber(), 0);
      if (totalDeposits <= 0) continue;
      const availableCash = bank.cashReserve.toNumber();
      const payoutRatio = Math.max(0, Math.min(1, availableCash / totalDeposits));
      let totalPaidOut = 0;

      for (const deposit of bank.deposits) {
        const balance = deposit.balance.toNumber();
        const payout = balance * payoutRatio;
        totalPaidOut += payout;
        await tx.playerStats.update({ where: { playerId: deposit.playerId }, data: { wealthLiquid: { increment: payout } } });
        await tx.playerCycleReport.upsert({
          where: { playerId_cycleId: { playerId: deposit.playerId, cycleId: openCycle.id } },
          create: { playerId: deposit.playerId, cycleId: openCycle.id, bankFailurePayout: payout },
          update: { bankFailurePayout: { increment: payout } },
        });
        await tx.bankDeposit.update({ where: { id: deposit.id }, data: { balance: 0, withdrawnCycle: openCycle.number } });
        await tx.playerNotification.create({
          data: {
            playerId: deposit.playerId,
            type: payoutRatio >= 0.999 ? "bank-failure-full-refund" : "bank-failure-partial-loss",
            message:
              payoutRatio >= 0.999
                ? `${bank.name} a fait faillite — ton dépôt de ${balance.toFixed(0)} € a été intégralement remboursé avant la liquidation.`
                : `${bank.name} a fait faillite — tu ne récupères que ${payout.toFixed(0)} € sur ton dépôt de ${balance.toFixed(0)} € (${(payoutRatio * 100).toFixed(0)}%), le reste est perdu.`,
            cycle: openCycle.number,
          },
        });
      }

      await tx.company.update({ where: { id: bank.id }, data: { cashReserve: { decrement: totalPaidOut } } });
    }

    for (const guild of detectedGuilds) {
      await tx.guild.update({
        where: { id: guild.id },
        data: { status: "DISSOLVED", dissolvedCycle: openCycle.number },
      });
      await tx.pressArticle.create({
        data: {
          category: "CARTEL_BUST",
          headline: `Le cartel "${guild.name}" a été démantelé — entente sur les prix découverte, amende collective infligée.`,
          cycle: openCycle.number,
        },
      });
      for (const member of guild.members) {
        const ownerId = primaryOwnerIdByCompany.get(member.companyId);
        if (!ownerId) continue;
        await tx.playerNotification.create({
          data: {
            playerId: ownerId,
            type: "guild-dissolved",
            message: `Le cartel "${guild.name}" a été démantelé — entente sur les prix découverte, amende et réputation entamée.`,
            cycle: openCycle.number,
          },
        });
      }
    }

    await tx.cycle.update({ where: { id: openCycle.id }, data: { status: "CLOSED", closedAt: new Date() } });
    const nextCycle = await tx.cycle.create({ data: { number: openCycle.number + 1, status: "OPEN" } });

    return {
      closedCycle: openCycle.number,
      payrollCount,
      companyReportCount: companyResults.length,
      nextCycle: nextCycle.number,
      noteworthyEvents,
    };
  }, CYCLE_CLOSE_TRANSACTION_OPTIONS);
}
