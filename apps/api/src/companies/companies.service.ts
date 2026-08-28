import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type {
  BuyShareListingInput,
  CastVoteInput,
  ContributeToCapitalRaiseInput,
  CreateCapitalRaiseInput,
  CreateCompanyInput,
  CreateInsuranceOfferInput,
  CreateLoanOfferInput,
  CreateProposalInput,
  CreateSaleListingInput,
  Department,
  DepositInput,
  HireEmployeeInput,
  InvestCompanyInput,
  InvestInCapacityExpansionInput,
  InvestmentAxis,
  LaunchMassMarketingCampaignInput,
  LaunchProductInput,
  LaunchTenderOfferInput,
  ListShareInput,
  ProductType,
  RequestLoanInput,
  SetAutoReinvestRuleInput,
  SetDepositRateInput,
  SetDistributionPolicyInput,
  SetPriceInput,
  SetProductAllocationInput,
  SubmitSaleBidInput,
  TenderSharesInput,
  WithdrawDepositInput,
  WithdrawLiquidationReserveInput,
} from "@patrimoine-jeu/domain";
import {
  ACTION_COOLDOWN_CYCLES,
  CAPITAL_RAISE_DURATION_CYCLES,
  DEFAULT_UNIT_PRICE,
  DEPARTMENT_CATALOG,
  DEPARTMENTS,
  EMPLOYEE_TIER_CATALOG,
  EXPANSION_MIN_CUMULATIVE_NET_PROFIT,
  EXPANSION_MIN_CYCLES_ACTIVE,
  INVESTMENT_AXIS_LABELS,
  LIQUIDATION_RESERVE_HOLDING_CYCLES,
  MASS_MARKETING_CAMPAIGN_DURATION_CYCLES,
  MAX_LOAN_PRINCIPAL_EQUITY_RATIO,
  MIN_TENDER_PREMIUM_RATIO,
  PRODUCT_CATALOG,
  PRODUCT_LAUNCH_COST,
  PRODUCT_TYPES,
  BRANDING_MAX_ELASTICITY_REDUCTION,
  DEMAND_PRICE_MULTIPLIER_CAP,
  PRICE_ELASTICITY_BASE,
  PROPOSAL_MAJORITY_THRESHOLD,
  PROPOSAL_VOTING_DURATION_CYCLES,
  PROVINCE_SECTOR_AFFINITIES,
  PROVINCE_SECTOR_AFFINITY_BONUS,
  REFERENCE_UNIT_PRICE,
  SALE_LISTING_DURATION_CYCLES,
  SOLVENCY_RATIO_CAP,
  STARTUP_COST_LEVEL_0,
  STARTUP_COST_LEVEL_1,
  SYSTEM_INSURANCE_COVERAGE_CAP,
  SYSTEM_INSURANCE_PREMIUM_PER_CYCLE,
  TENDER_OFFER_DURATION_CYCLES,
} from "@patrimoine-jeu/domain";
import {
  assembleCompanyBalanceSheet,
  computeBankReliabilityRating,
  computeCapacityExpansionMultiplier,
  computeDepartmentContribution,
  computeDepartmentExperienceBonus,
  computeDilutedSharePercentage,
  computeEffectiveAttractiveness,
  computeEffectiveInvestmentLevel,
  computeFoundingAttractiveness,
  computeFoundingCost,
  computeInfrastructureAttractivenessBonus,
  computeMassMarketingCampaignBoost,
  computeQualityPriceTolerance,
  computeLiquidationReserveWithdrawal,
  computeLoanRate,
  computeProductUnitCost,
  computeRdStaffInnovationBonus,
  computeValorizationMultiplier,
  isLiquidationReserveMature,
} from "@patrimoine-jeu/game-engine";
import { CyclesService } from "../cycles/cycles.service.js";
import { DiscordNotifierService } from "../discord/discord-notifier.service.js";
import { AchievementsService } from "../engagement/achievements.service.js";
import { PrismaService } from "../prisma/prisma.service.js";

const LEVEL_0 = 0;

const INVESTMENT_FIELD_BY_AXIS: Record<
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

const COOLDOWN_MESSAGE = `Cette action a déjà été faite récemment sur cette entreprise — attends au moins ${ACTION_COOLDOWN_CYCLES} cycles avant de réessayer, le temps qui passe ne s'achète pas`;

/** Part de capacité offerte à une gamme fraîchement lancée — le joueur ajuste ensuite librement (cf. setProductAllocation). */
const PRODUCT_INITIAL_ALLOCATION = 20;

const CYCLE_REPORT_INCLUDE = { orderBy: { cycle: { number: "desc" as const } }, take: 1 };
const PRODUCT_VIEW_INCLUDE = { cycleReports: CYCLE_REPORT_INCLUDE };
const COMPANY_VIEW_INCLUDE = {
  sector: true,
  municipality: true,
  cycleReports: CYCLE_REPORT_INCLUDE,
  products: { include: PRODUCT_VIEW_INCLUDE },
  loans: true,
  loansAsLender: true,
  loanOffers: true,
  departments: true,
  employeeCounts: true,
  deposits: { where: { withdrawnCycle: null } },
};

interface OwnedCompanySummary {
  foundedCycle: number;
  cumulativeNetProfit: number;
}

interface ShareLike {
  playerId: string | null;
  holderCompanyId?: string | null;
  sharePercentage: { toNumber(): number };
}

@Injectable()
export class CompaniesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cyclesService: CyclesService,
    private readonly achievementsService: AchievementsService,
    private readonly discordNotifier: DiscordNotifierService,
  ) {}

  listFoundableSectors() {
    return this.prisma.client.sector.findMany({ orderBy: [{ level: "asc" }, { name: "asc" }] });
  }

  listMunicipalities() {
    return this.prisma.client.municipality.findMany({
      include: { region: true },
      orderBy: [{ region: { name: "asc" } }, { name: "asc" }],
    });
  }

  async listMyCompanies(playerId: string) {
    const [shares, currentCycle, primaryOwned] = await Promise.all([
      this.prisma.client.companyShare.findMany({
        where: { playerId },
        include: { company: { include: { ...COMPANY_VIEW_INCLUDE, shares: true } } },
      }),
      this.cyclesService.getOrCreateOpenCycle(),
      // Seules les entreprises qu'on dirige réellement (actionnaire
      // principal, directement ou via une holding qu'on contrôle) comptent
      // pour le seuil de maturité — une participation minoritaire achetée
      // sur le marché ne doit pas permettre de débloquer la fondation d'une
      // nouvelle entreprise à sa place.
      this.getUltimatelyControlledActiveCompanies(playerId),
    ]);

    return {
      companies: shares.map((share) =>
        this.toCompanyView(share.company, share.sharePercentage.toNumber(), currentCycle.number),
      ),
      nextFoundingCost: computeFoundingCost(primaryOwned.length, STARTUP_COST_LEVEL_0),
      nextFoundingCostLevel1: computeFoundingCost(primaryOwned.length, STARTUP_COST_LEVEL_1),
      canFoundAnother: primaryOwned.length === 0 || this.hasMatureCompany(primaryOwned, currentCycle.number),
      expansionRequirement:
        primaryOwned.length === 0
          ? null
          : { minCyclesActive: EXPANSION_MIN_CYCLES_ACTIVE, minCumulativeNetProfit: EXPANSION_MIN_CUMULATIVE_NET_PROFIT },
    };
  }

  /**
   * Vue consolidée du groupe — toutes les entreprises ACTIVES que ce joueur
   * contrôle en dernier ressort, directement ou via une chaîne de holding
   * (cf. resolveUltimateControllerId), avec des KPIs agrégés. Piloter un
   * empire plutôt qu'une seule fiche isolée : trésorerie et profit cumulés
   * sur tout le groupe, et repérer d'un coup d'œil la filiale la moins
   * performante.
   */
  async getGroupOverview(playerId: string) {
    const currentCycle = await this.cyclesService.getOrCreateOpenCycle();
    const companies = await this.prisma.client.company.findMany({
      where: { status: "ACTIVE" },
      include: { shares: true, cycleReports: CYCLE_REPORT_INCLUDE, sector: true, municipality: true },
    });

    const controlled: (typeof companies)[number][] = [];
    for (const company of companies) {
      if ((await this.resolveUltimateControllerId(company.shares)) === playerId) {
        controlled.push(company);
      }
    }

    const rows = controlled.map((company) => {
      const latestReport = company.cycleReports[0];
      const latestRevenue = latestReport?.revenue.toNumber() ?? 0;
      const latestNetProfit = latestReport ? latestReport.profit.toNumber() - latestReport.taxPaid.toNumber() : 0;
      const cyclesActive = Math.max(1, currentCycle.number - company.foundedCycle);
      const isSubsidiary = company.shares.some((s) => s.holderCompanyId !== null);
      return {
        id: company.id,
        name: company.name,
        sector: company.sector.name,
        municipality: company.municipality.name,
        isSubsidiary,
        cashReserve: company.cashReserve.toNumber(),
        cumulativeNetProfit: company.cumulativeNetProfit.toNumber(),
        latestRevenue,
        latestNetProfit,
        valorizationMultiplier: computeValorizationMultiplier(company.cumulativeNetProfit.toNumber(), cyclesActive),
      };
    });

    const worstPerformer =
      rows.length > 0 ? rows.reduce((min, r) => (r.latestNetProfit < min.latestNetProfit ? r : min)) : null;

    return {
      companies: rows,
      totalCashReserve: rows.reduce((sum, r) => sum + r.cashReserve, 0),
      totalCumulativeNetProfit: rows.reduce((sum, r) => sum + r.cumulativeNetProfit, 0),
      totalLatestRevenue: rows.reduce((sum, r) => sum + r.latestRevenue, 0),
      totalLatestNetProfit: rows.reduce((sum, r) => sum + r.latestNetProfit, 0),
      worstPerformerId: worstPerformer && worstPerformer.latestNetProfit < 0 ? worstPerformer.id : null,
    };
  }

  async found(playerId: string, input: CreateCompanyInput) {
    const [sector, municipality, stats, currentCycle, primaryOwned] = await Promise.all([
      this.prisma.client.sector.findUnique({ where: { id: input.sectorId } }),
      this.prisma.client.municipality.findUnique({ where: { id: input.municipalityId } }),
      this.prisma.client.playerStats.findUnique({ where: { playerId } }),
      this.cyclesService.getOrCreateOpenCycle(),
      this.getUltimatelyControlledActiveCompanies(playerId),
    ]);

    if (!sector) {
      throw new BadRequestException("Secteur inconnu");
    }
    if (!municipality) {
      throw new NotFoundException("Commune inconnue");
    }

    // Chaîne de valeur (section 8 du document de conception) : un secteur
    // de niveau 1 s'approvisionne en matières premières auprès du niveau 0
    // parent (cf. game-engine/supply-chain.ts) — le fonder suppose d'avoir
    // déjà dirigé une entreprise dans ce secteur parent, l'"expérience
    // minimale" demandée par le document de conception, en plus d'un
    // capital de départ plus élevé (cf. STARTUP_COST_LEVEL_1), directement
    // ou via une holding qu'on contrôle.
    if (sector.level === 1) {
      const hasParentSectorExperience = primaryOwned.some((company) => company.sectorId === sector.parentSectorId);
      if (!hasParentSectorExperience) {
        throw new BadRequestException(
          "Il faut d'abord avoir dirigé une entreprise dans le secteur parent avant de fonder à ce palier",
        );
      }
    } else if (sector.level !== LEVEL_0) {
      throw new BadRequestException("Secteur non accessible pour l'instant");
    }

    if (primaryOwned.length > 0 && !this.hasMatureCompany(primaryOwned, currentCycle.number)) {
      throw new BadRequestException(
        `Il faut d'abord faire ses preuves : au moins une entreprise dirigée depuis ${EXPANSION_MIN_CYCLES_ACTIVE} cycles ` +
          `et ${EXPANSION_MIN_CUMULATIVE_NET_PROFIT} € de profit net cumulé avant de pouvoir en fonder une nouvelle`,
      );
    }

    const foundingCost = computeFoundingCost(
      primaryOwned.length,
      sector.level === 1 ? STARTUP_COST_LEVEL_1 : STARTUP_COST_LEVEL_0,
    );
    if (!stats || stats.wealthLiquid.toNumber() < foundingCost) {
      throw new BadRequestException(
        `Fonds insuffisants — il faut ${foundingCost} € de patrimoine liquide pour fonder cette entreprise`,
      );
    }

    const sectorExperience = await this.prisma.client.playerSectorExperience.findUnique({
      where: { playerId_sector: { playerId, sector: sector.name } },
    });
    const attractivenessScore = computeFoundingAttractiveness(sectorExperience?.cycles ?? 0);

    const company = await this.prisma.client.$transaction(async (tx) => {
      await tx.playerStats.update({
        where: { playerId },
        data: { wealthLiquid: { decrement: foundingCost } },
      });

      const created = await tx.company.create({
        data: {
          sectorId: sector.id,
          municipalityId: municipality.id,
          name: input.name,
          attractivenessScore,
          foundedCycle: currentCycle.number,
          products: {
            create: {
              type: "core",
              unitPrice: DEFAULT_UNIT_PRICE,
              capacityAllocation: 100,
              launchedCycle: currentCycle.number,
            },
          },
          departments: {
            create: DEPARTMENTS.map((department) => ({ department })),
          },
        },
        include: COMPANY_VIEW_INCLUDE,
      });

      await tx.companyShare.create({
        data: { companyId: created.id, playerId, sharePercentage: 100 },
      });

      return created;
    });

    await this.achievementsService.tryUnlock(playerId, "first-company");

    return this.toCompanyView(company, 100, currentCycle.number);
  }

  async hireManager(playerId: string, companyId: string) {
    await this.assertPrimaryOwner(playerId, companyId);
    const company = await this.prisma.client.company.update({
      where: { id: companyId },
      data: { hasManager: true },
      include: COMPANY_VIEW_INCLUDE,
    });
    const share = await this.prisma.client.companyShare.findUnique({
      where: { companyId_playerId: { companyId, playerId } },
    });
    const currentCycle = await this.cyclesService.getOrCreateOpenCycle();
    return this.toCompanyView(company, share?.sharePercentage.toNumber() ?? 0, currentCycle.number);
  }

  async fireManager(playerId: string, companyId: string) {
    await this.assertPrimaryOwner(playerId, companyId);
    const company = await this.prisma.client.company.update({
      where: { id: companyId },
      data: { hasManager: false },
      include: COMPANY_VIEW_INCLUDE,
    });
    const share = await this.prisma.client.companyShare.findUnique({
      where: { companyId_playerId: { companyId, playerId } },
    });
    const currentCycle = await this.cyclesService.getOrCreateOpenCycle();
    return this.toCompanyView(company, share?.sharePercentage.toNumber() ?? 0, currentCycle.number);
  }

  async invest(playerId: string, companyId: string, input: InvestCompanyInput) {
    await this.assertPrimaryOwner(playerId, companyId);

    const stats = await this.prisma.client.playerStats.findUnique({ where: { playerId } });
    if (!stats || stats.wealthLiquid.toNumber() < input.amount) {
      throw new BadRequestException("Fonds insuffisants pour cet investissement");
    }

    const field = INVESTMENT_FIELD_BY_AXIS[input.axis];
    const currentCycle = await this.cyclesService.getOrCreateOpenCycle();

    const company = await this.prisma.client.$transaction(async (tx) => {
      await this.enforceCooldown(tx, companyId, `invest:${input.axis}`, currentCycle.number);

      await tx.playerStats.update({
        where: { playerId },
        data: { wealthLiquid: { decrement: input.amount } },
      });

      return tx.company.update({
        where: { id: companyId },
        data: { [field]: { increment: input.amount } },
        include: COMPANY_VIEW_INCLUDE,
      });
    });

    const share = await this.prisma.client.companyShare.findUnique({
      where: { companyId_playerId: { companyId, playerId } },
    });
    return this.toCompanyView(company, share?.sharePercentage.toNumber() ?? 0, currentCycle.number);
  }

  /**
   * Expansion de capacité (cf. domain/company.ts) — contrairement à invest()
   * ci-dessus, PAS de cooldown ni de plafond par action : le seul endroit du
   * jeu où l'argent disponible compte vraiment sans limite de rythme.
   */
  async investInCapacityExpansion(playerId: string, companyId: string, input: InvestInCapacityExpansionInput) {
    await this.assertPrimaryOwner(playerId, companyId);

    // Financé par la trésorerie de L'ENTREPRISE, pas le patrimoine personnel
    // du joueur — agrandir un site de production est une dépense de
    // l'entreprise, comme ses salaires ou son emprunt (cf. requestLoan).
    const company = await this.prisma.client.company.findUnique({ where: { id: companyId } });
    if (!company || company.cashReserve.toNumber() < input.amount) {
      throw new BadRequestException("Trésorerie insuffisante pour cet investissement");
    }

    const currentCycle = await this.cyclesService.getOrCreateOpenCycle();
    const updated = await this.prisma.client.company.update({
      where: { id: companyId },
      data: {
        cashReserve: { decrement: input.amount },
        capacityExpansionInvestment: { increment: input.amount },
      },
      include: COMPANY_VIEW_INCLUDE,
    });

    const share = await this.prisma.client.companyShare.findUnique({
      where: { companyId_playerId: { companyId, playerId } },
    });
    return this.toCompanyView(updated, share?.sharePercentage.toNumber() ?? 0, currentCycle.number);
  }

  /**
   * Campagne marketing de masse (cf. domain/company.ts) — bonus de
   * compétitivité TEMPORAIRE (contrairement au levier marketing permanent),
   * sans cooldown ni plafond par action. Une nouvelle campagne remplace la
   * précédente (magnitude et échéance écrasées), pas cumulative.
   */
  async launchMassMarketingCampaign(playerId: string, companyId: string, input: LaunchMassMarketingCampaignInput) {
    await this.assertPrimaryOwner(playerId, companyId);

    // Financé par la trésorerie de L'ENTREPRISE, pas le patrimoine personnel
    // du joueur — une campagne publicitaire est une dépense de l'entreprise.
    const company = await this.prisma.client.company.findUnique({ where: { id: companyId } });
    if (!company || company.cashReserve.toNumber() < input.amount) {
      throw new BadRequestException("Trésorerie insuffisante pour cette campagne");
    }

    const currentCycle = await this.cyclesService.getOrCreateOpenCycle();
    const magnitude = computeMassMarketingCampaignBoost(input.amount);
    const updated = await this.prisma.client.company.update({
      where: { id: companyId },
      data: {
        cashReserve: { decrement: input.amount },
        massMarketingBoostMagnitude: magnitude,
        massMarketingBoostExpiresCycle: currentCycle.number + MASS_MARKETING_CAMPAIGN_DURATION_CYCLES,
      },
      include: COMPANY_VIEW_INCLUDE,
    });

    const share = await this.prisma.client.companyShare.findUnique({
      where: { companyId_playerId: { companyId, playerId } },
    });
    return this.toCompanyView(updated, share?.sharePercentage.toNumber() ?? 0, currentCycle.number);
  }

  /**
   * Règle par défaut (cf. domain/default-rules.ts) — jusqu'à capPerCycle du
   * profit net POSITIF de chaque cycle est automatiquement détourné vers ce
   * levier avant la distribution dividende/réserve habituelle (cf.
   * game-engine/cycles.ts). axis null désactive la règle.
   */
  async setAutoReinvestRule(playerId: string, companyId: string, input: SetAutoReinvestRuleInput) {
    await this.assertPrimaryOwner(playerId, companyId);
    await this.prisma.client.company.update({
      where: { id: companyId },
      data: {
        autoReinvestAxis: input.axis,
        autoReinvestCapPerCycle: input.axis ? input.capPerCycle : null,
      },
    });
    return { axis: input.axis, capPerCycle: input.axis ? input.capPerCycle : null };
  }

  /**
   * Lancer une nouvelle gamme de produit — débloquée par le niveau de R&D
   * (levier innovation), payante (PRODUCT_LAUNCH_COST), et soumise au même
   * cooldown que les leviers d'investissement : un engagement, pas un
   * réglage. Elle démarre avec une petite part de la capacité totale
   * (PRODUCT_INITIAL_ALLOCATION), au détriment de "core" qui absorbe
   * automatiquement le reste — le joueur réajuste ensuite librement (cf.
   * setProductAllocation).
   */
  async launchProduct(playerId: string, companyId: string, input: LaunchProductInput) {
    await this.assertPrimaryOwner(playerId, companyId);

    const [company, stats] = await Promise.all([
      this.prisma.client.company.findUnique({
        where: { id: companyId },
        include: { products: true, departments: true, employeeCounts: true },
      }),
      this.prisma.client.playerStats.findUnique({ where: { playerId } }),
    ]);
    if (!company) {
      throw new NotFoundException("Entreprise introuvable");
    }
    if (company.products.some((p) => p.type === input.type)) {
      throw new BadRequestException("Cette gamme est déjà active pour cette entreprise");
    }

    const innovationLevel = this.computeEffectiveInnovationLevel(
      company.innovationInvestment.toNumber(),
      company.departments,
      company.employeeCounts,
    );
    const catalogEntry = PRODUCT_CATALOG[input.type];
    // Comparé au niveau ARRONDI, pas brut : c'est ce nombre arrondi que le
    // joueur voit affiché partout (fiche entreprise, catalogue) — sans ça,
    // un niveau affiché "35" mais réellement 34.6 refuserait le
    // déblocage alors que tout ce que le joueur peut observer dit "35".
    if (Math.round(innovationLevel) < catalogEntry.unlockInnovationLevel) {
      throw new BadRequestException(
        `Cette gamme demande un niveau de R&D d'au moins ${catalogEntry.unlockInnovationLevel} (actuellement ${Math.round(innovationLevel)})`,
      );
    }
    if (!stats || stats.wealthLiquid.toNumber() < PRODUCT_LAUNCH_COST) {
      throw new BadRequestException(`Fonds insuffisants — il faut ${PRODUCT_LAUNCH_COST} € de patrimoine liquide pour lancer cette gamme`);
    }

    const currentCycle = await this.cyclesService.getOrCreateOpenCycle();
    const nonCoreSum = company.products
      .filter((p) => p.type !== "core")
      .reduce((sum, p) => sum + p.capacityAllocation.toNumber(), 0);
    const initialAllocation = Math.max(0, Math.min(PRODUCT_INITIAL_ALLOCATION, 100 - nonCoreSum));

    const updated = await this.prisma.client.$transaction(async (tx) => {
      await this.enforceCooldown(tx, companyId, "launchProduct", currentCycle.number);

      await tx.playerStats.update({
        where: { playerId },
        data: { wealthLiquid: { decrement: PRODUCT_LAUNCH_COST } },
      });

      await tx.companyProduct.create({
        data: {
          companyId,
          type: input.type,
          unitPrice: DEFAULT_UNIT_PRICE * catalogEntry.referencePriceMultiplier,
          capacityAllocation: initialAllocation,
          launchedCycle: currentCycle.number,
        },
      });

      return tx.company.findUniqueOrThrow({ where: { id: companyId }, include: COMPANY_VIEW_INCLUDE });
    });

    const share = await this.prisma.client.companyShare.findUnique({
      where: { companyId_playerId: { companyId, playerId } },
    });
    return this.toCompanyView(updated, share?.sharePercentage.toNumber() ?? 0, currentCycle.number);
  }

  /**
   * Le prix de vente est un levier opérationnel, ajustable à chaque cycle
   * sans cooldown ni coût — contrairement aux onze leviers d'investissement,
   * qui sont des engagements à long terme (cf. domain/company.ts). Propre à
   * chaque gamme.
   */
  async setProductPrice(playerId: string, companyId: string, productId: string, input: SetPriceInput) {
    await this.assertPrimaryOwner(playerId, companyId);
    const product = await this.assertProductBelongsToCompany(productId, companyId);

    // Cartel (cf. domain/guild.ts) : le prix plancher ne s'applique qu'à la
    // gamme "core", celle sur laquelle porte l'entente.
    if (product.type === "core") {
      const membership = await this.prisma.client.guildMembership.findFirst({
        where: { companyId, guild: { status: "ACTIVE" } },
        include: { guild: true },
      });
      if (membership && input.unitPrice < membership.guild.priceFloor.toNumber()) {
        throw new BadRequestException(
          `Le cartel "${membership.guild.name}" impose un prix plancher de ${membership.guild.priceFloor.toNumber().toFixed(2)} € — respecte l'entente ou quitte le cartel`,
        );
      }
    }

    await this.prisma.client.companyProduct.update({
      where: { id: productId },
      data: { unitPrice: input.unitPrice },
    });

    return this.refreshCompanyView(playerId, companyId);
  }

  /**
   * Répartition de la capacité entre gammes — "core" n'est jamais réglée
   * directement, elle absorbe ce qui reste (cf. domain/company.ts).
   */
  async setProductAllocation(playerId: string, companyId: string, productId: string, input: SetProductAllocationInput) {
    await this.assertPrimaryOwner(playerId, companyId);
    const product = await this.assertProductBelongsToCompany(productId, companyId);
    if (product.type === "core") {
      throw new BadRequestException(
        "La gamme \"core\" absorbe automatiquement la capacité restante, elle ne se règle pas directement — ajuste les autres gammes",
      );
    }

    const others = await this.prisma.client.companyProduct.findMany({
      where: { companyId, type: { not: "core" }, id: { not: productId } },
    });
    const othersSum = others.reduce((sum, p) => sum + p.capacityAllocation.toNumber(), 0);
    if (othersSum + input.capacityAllocation > 100) {
      throw new BadRequestException(
        `Cette répartition dépasserait 100% de la capacité (${othersSum}% déjà allouée aux autres gammes) — réduis une autre gamme d'abord`,
      );
    }

    await this.prisma.client.companyProduct.update({
      where: { id: productId },
      data: { capacityAllocation: input.capacityAllocation },
    });

    return this.refreshCompanyView(playerId, companyId);
  }

  /**
   * Emprunt bancaire — la banque est toujours le système, jamais un autre
   * joueur (cf. domain/finance.ts). Taux fixé une fois pour toutes selon le
   * ratio dette/fonds propres PROJETÉ (avec ce nouveau prêt), plafonné à
   * MAX_LOAN_PRINCIPAL_EQUITY_RATIO fois les fonds propres actuels — pas de
   * surendettement illimité. Un prêt en défaut bloque tout nouvel emprunt
   * tant qu'il subsiste.
   */
  async requestLoan(playerId: string, companyId: string, input: RequestLoanInput) {
    await this.assertPrimaryOwner(playerId, companyId);

    const company = await this.prisma.client.company.findUnique({
      where: { id: companyId },
      include: { loans: true, products: true },
    });
    if (!company) {
      throw new NotFoundException("Entreprise introuvable");
    }
    if (company.loans.some((l) => l.status === "DEFAULTED")) {
      throw new BadRequestException(
        "Cette entreprise a un prêt en défaut de paiement — impossible d'emprunter à nouveau tant qu'il n'est pas soldé",
      );
    }

    const activeLoans = company.loans.filter((l) => l.status === "ACTIVE");
    const balanceSheet = this.computeBalanceSheetForCompany({ ...company, loans: activeLoans });
    const maxPrincipal = Math.max(0, balanceSheet.equity * MAX_LOAN_PRINCIPAL_EQUITY_RATIO);
    if (input.principal > maxPrincipal) {
      throw new BadRequestException(
        `Cet emprunt dépasserait la capacité d'endettement de l'entreprise — maximum ${maxPrincipal.toFixed(0)} € (${MAX_LOAN_PRINCIPAL_EQUITY_RATIO}x les fonds propres actuels)`,
      );
    }

    const currentDebt = activeLoans.reduce((sum, l) => sum + l.remainingBalance.toNumber(), 0);
    const rate = computeLoanRate(currentDebt, input.principal, balanceSheet.equity);
    const currentCycle = await this.cyclesService.getOrCreateOpenCycle();

    await this.prisma.client.$transaction(async (tx) => {
      await tx.companyLoan.create({
        data: {
          companyId,
          principal: input.principal,
          rate,
          termCycles: input.termCycles,
          remainingBalance: input.principal,
          originatedCycle: currentCycle.number,
        },
      });
      // La dette est portée par l'entreprise (CompanyLoan.companyId) et
      // remboursée par sa propre trésorerie à chaque cycle (cf.
      // game-engine/cycles.ts, computeLoanCyclePayment) — l'argent emprunté
      // doit donc atterrir dans SA trésorerie, pas dans le patrimoine
      // personnel du joueur.
      await tx.company.update({ where: { id: companyId }, data: { cashReserve: { increment: input.principal } } });
    });

    return this.refreshCompanyView(playerId, companyId);
  }

  /**
   * Politique de distribution des bénéfices (cf. domain/dividends.ts) —
   * même cooldown hebdomadaire que les leviers d'investissement, pour
   * éviter les allers-retours tactiques cycle par cycle.
   */
  async setDistributionPolicy(playerId: string, companyId: string, input: SetDistributionPolicyInput) {
    await this.assertPrimaryOwner(playerId, companyId);
    const currentCycle = await this.cyclesService.getOrCreateOpenCycle();

    await this.prisma.client.$transaction(async (tx) => {
      await this.enforceCooldown(tx, companyId, "distribution-policy", currentCycle.number);
      await tx.company.update({ where: { id: companyId }, data: { distributionPolicy: input.policy } });
    });

    return this.refreshCompanyView(playerId, companyId);
  }

  /**
   * Retrait de la réserve de liquidation, réparti aux actionnaires au
   * prorata de leurs parts (comme un dividende) — gratuit après maturité
   * (~1 an, LIQUIDATION_RESERVE_HOLDING_CYCLES), sinon une taxe de sortie
   * anticipée s'applique (cf. computeLiquidationReserveWithdrawal).
   */
  async withdrawLiquidationReserve(playerId: string, companyId: string, input: WithdrawLiquidationReserveInput) {
    await this.assertPrimaryOwner(playerId, companyId);

    const company = await this.prisma.client.company.findUnique({
      where: { id: companyId },
      include: { shares: true },
    });
    if (!company) {
      throw new NotFoundException("Entreprise introuvable");
    }
    if (input.amount > company.liquidationReserve.toNumber()) {
      throw new BadRequestException(
        `Tu ne peux pas retirer plus que la réserve disponible (${company.liquidationReserve.toNumber().toFixed(0)} €)`,
      );
    }

    const currentCycle = await this.cyclesService.getOrCreateOpenCycle();
    const isMature =
      company.liquidationReserveSinceCycle !== null &&
      isLiquidationReserveMature(company.liquidationReserveSinceCycle, currentCycle.number);
    const { net } = computeLiquidationReserveWithdrawal(input.amount, isMature);
    const remaining = company.liquidationReserve.toNumber() - input.amount;

    await this.prisma.client.$transaction(async (tx) => {
      await tx.company.update({
        where: { id: companyId },
        data: {
          liquidationReserve: remaining,
          ...(remaining <= 0.01 ? { liquidationReserveSinceCycle: null } : {}),
        },
      });

      for (const share of company.shares) {
        const shareFraction = share.sharePercentage.toNumber() / 100;
        const amount = net * shareFraction;
        if (amount <= 0) continue;
        if (share.playerId) {
          await tx.playerStats.update({
            where: { playerId: share.playerId },
            data: { wealthLiquid: { increment: amount } },
          });
        } else if (share.holderCompanyId) {
          await tx.company.update({
            where: { id: share.holderCompanyId },
            data: { cashReserve: { increment: amount } },
          });
        }
      }
    });

    return this.refreshCompanyView(playerId, companyId);
  }

  async getCompany(playerId: string, companyId: string) {
    await this.assertHasShare(playerId, companyId);

    const [company, share, currentCycle, openListings, subsidiaryShares] = await Promise.all([
      this.prisma.client.company.findUnique({
        where: { id: companyId },
        include: {
          ...COMPANY_VIEW_INCLUDE,
          shares: { include: { player: { select: { pseudo: true } }, holderCompany: { select: { id: true, name: true } } } },
        },
      }),
      this.prisma.client.companyShare.findUnique({ where: { companyId_playerId: { companyId, playerId } } }),
      this.cyclesService.getOrCreateOpenCycle(),
      this.prisma.client.companyShareListing.findMany({
        where: { companyId, status: "OPEN" },
        include: { seller: { select: { pseudo: true } } },
        orderBy: { createdAt: "desc" },
      }),
      // Groupe/holding : filiales dont CETTE entreprise détient des parts (cf. CompanyShare.holderCompany).
      this.prisma.client.companyShare.findMany({
        where: { holderCompanyId: companyId },
        include: { company: { select: { id: true, name: true } } },
      }),
    ]);

    if (!company) {
      throw new NotFoundException("Entreprise introuvable");
    }

    const [sectorCompetitors, activePlayerCompetitorsCount] = await Promise.all([
      this.prisma.client.sectorCompetitor.findMany({
        where: { sectorId: company.sectorId },
        orderBy: { competitiveness: "desc" },
      }),
      this.prisma.client.company.count({
        where: { sectorId: company.sectorId, status: "ACTIVE", id: { not: companyId } },
      }),
    ]);

    const primaryOwnerId = await this.resolveUltimateControllerId(company.shares);
    const innovationLevel = this.computeEffectiveInnovationLevel(
      company.innovationInvestment.toNumber(),
      company.departments,
      company.employeeCounts,
    );
    const activeTypes = new Set(company.products.map((p) => p.type));
    const balanceSheet = this.computeBalanceSheetForCompany(company);
    const parentHoldingShare = company.shares.find((s) => s.holderCompanyId);

    return {
      ...this.toCompanyView(company, share?.sharePercentage.toNumber() ?? 0, currentCycle.number),
      isPrimaryOwner: primaryOwnerId === playerId,
      shareholders: company.shares
        .map((s) => ({
          pseudo: s.player?.pseudo ?? `🏢 ${s.holderCompany?.name ?? "?"}`,
          sharePercentage: s.sharePercentage.toNumber(),
        }))
        .sort((a, b) => b.sharePercentage - a.sharePercentage),
      parentHolding: parentHoldingShare?.holderCompany
        ? { id: parentHoldingShare.holderCompany.id, name: parentHoldingShare.holderCompany.name, sharePercentage: parentHoldingShare.sharePercentage.toNumber() }
        : null,
      subsidiaries: subsidiaryShares.map((s) => ({
        id: s.company.id,
        name: s.company.name,
        sharePercentage: s.sharePercentage.toNumber(),
      })),
      openListings: openListings.map((listing) => ({
        id: listing.id,
        sellerPseudo: listing.seller.pseudo,
        isMine: listing.sellerId === playerId,
        sharePercentage: listing.sharePercentage.toNumber(),
        price: listing.price.toNumber(),
      })),
      productCatalog: PRODUCT_TYPES.filter((type) => !activeTypes.has(type)).map((type) => ({
        type,
        label: PRODUCT_CATALOG[type].label,
        description: PRODUCT_CATALOG[type].description,
        unlockInnovationLevel: PRODUCT_CATALOG[type].unlockInnovationLevel,
        isUnlocked: Math.round(innovationLevel) >= PRODUCT_CATALOG[type].unlockInnovationLevel,
        launchCost: PRODUCT_LAUNCH_COST,
      })),
      sectorCompetitors: sectorCompetitors.map((c) => ({
        name: c.name,
        competitiveness: c.competitiveness.toNumber(),
      })),
      activePlayerCompetitorsCount,
      balanceSheet,
      loans: company.loans.map((loan) => ({
        id: loan.id,
        principal: loan.principal.toNumber(),
        rate: loan.rate.toNumber(),
        termCycles: loan.termCycles,
        remainingBalance: loan.remainingBalance.toNumber(),
        status: loan.status,
        originatedCycle: loan.originatedCycle,
      })),
      hasDefaultedLoan: company.loans.some((l) => l.status === "DEFAULTED"),
      loanOffers: company.loanOffers.map((offer) => ({
        id: offer.id,
        principal: offer.principal.toNumber(),
        rate: offer.rate.toNumber(),
        termCycles: offer.termCycles,
      })),
      loansAsLender: company.loansAsLender
        .filter((loan) => loan.status === "ACTIVE")
        .map((loan) => ({
          id: loan.id,
          principal: loan.principal.toNumber(),
          rate: loan.rate.toNumber(),
          termCycles: loan.termCycles,
          remainingBalance: loan.remainingBalance.toNumber(),
        })),
    };
  }

  /**
   * Contrats B2B récents (achats et ventes de matières premières) — cf.
   * game-engine/supply-chain.ts pour l'appariement automatique à chaque
   * clôture de cycle. Les 20 derniers, tous rôles confondus, les plus
   * récents en premier.
   */
  async getSupplyContracts(playerId: string, companyId: string) {
    await this.assertHasShare(playerId, companyId);

    const contracts = await this.prisma.client.supplyContract.findMany({
      where: { OR: [{ buyerCompanyId: companyId }, { sellerCompanyId: companyId }] },
      include: {
        buyer: { select: { name: true } },
        seller: { select: { name: true } },
        sector: { select: { name: true } },
        cycle: { select: { number: true } },
      },
      orderBy: { cycle: { number: "desc" } },
      take: 20,
    });

    return contracts.map((contract) => ({
      id: contract.id,
      role: contract.buyerCompanyId === companyId ? ("buyer" as const) : ("seller" as const),
      counterpartyName: contract.buyerCompanyId === companyId ? contract.seller.name : contract.buyer.name,
      sectorName: contract.sector.name,
      quantity: contract.quantity.toNumber(),
      price: contract.price.toNumber(),
      total: contract.quantity.toNumber() * contract.price.toNumber(),
      cycleNumber: contract.cycle.number,
    }));
  }

  async hireEmployee(playerId: string, companyId: string, input: HireEmployeeInput) {
    await this.assertPrimaryOwner(playerId, companyId);

    const currentCycle = await this.cyclesService.getOrCreateOpenCycle();

    await this.prisma.client.$transaction(async (tx) => {
      await this.enforceCooldown(tx, companyId, `hire:${input.department}`, currentCycle.number);

      await tx.companyEmployeeCount.upsert({
        where: { companyId_department_tier: { companyId, department: input.department, tier: input.tier } },
        create: { companyId, department: input.department, tier: input.tier, count: 1 },
        update: { count: { increment: 1 } },
      });
    });

    return this.refreshCompanyView(playerId, companyId);
  }

  async fireEmployee(playerId: string, companyId: string, input: HireEmployeeInput) {
    await this.assertPrimaryOwner(playerId, companyId);

    const existing = await this.prisma.client.companyEmployeeCount.findUnique({
      where: { companyId_department_tier: { companyId, department: input.department, tier: input.tier } },
    });
    if (!existing || existing.count <= 0) {
      throw new BadRequestException(
        `Aucun employé "${EMPLOYEE_TIER_CATALOG[input.tier].label}" au département ${DEPARTMENT_CATALOG[input.department].label} à licencier`,
      );
    }

    await this.prisma.client.companyEmployeeCount.update({
      where: { companyId_department_tier: { companyId, department: input.department, tier: input.tier } },
      data: { count: { decrement: 1 } },
    });

    return this.refreshCompanyView(playerId, companyId);
  }

  /** Responsable de département — en plus du dirigeant général (cf. hireManager/fireManager), sans cooldown, comme lui. */
  async hireDepartmentManager(playerId: string, companyId: string, department: Department) {
    await this.assertPrimaryOwner(playerId, companyId);

    await this.prisma.client.companyDepartment.upsert({
      where: { companyId_department: { companyId, department } },
      create: { companyId, department, hasManager: true },
      update: { hasManager: true },
    });

    return this.refreshCompanyView(playerId, companyId);
  }

  async fireDepartmentManager(playerId: string, companyId: string, department: Department) {
    await this.assertPrimaryOwner(playerId, companyId);

    await this.prisma.client.companyDepartment.upsert({
      where: { companyId_department: { companyId, department } },
      create: { companyId, department, hasManager: false },
      update: { hasManager: false },
    });

    return this.refreshCompanyView(playerId, companyId);
  }

  // --- Marché des parts ------------------------------------------------

  async listShareForSale(playerId: string, companyId: string, input: ListShareInput) {
    const share = await this.prisma.client.companyShare.findUnique({
      where: { companyId_playerId: { companyId, playerId } },
    });
    if (!share || share.sharePercentage.toNumber() <= 0) {
      throw new ForbiddenException("Tu ne possèdes pas de parts dans cette entreprise");
    }

    const openListings = await this.prisma.client.companyShareListing.findMany({
      where: { companyId, sellerId: playerId, status: "OPEN" },
    });
    const alreadyListed = openListings.reduce((sum, l) => sum + l.sharePercentage.toNumber(), 0);
    if (alreadyListed + input.sharePercentage > share.sharePercentage.toNumber()) {
      throw new BadRequestException(
        `Tu ne peux pas mettre en vente plus de parts que tu n'en possèdes (${share.sharePercentage.toNumber()}%, dont ${alreadyListed}% déjà en vente)`,
      );
    }

    return this.prisma.client.companyShareListing.create({
      data: {
        companyId,
        sellerId: playerId,
        sharePercentage: input.sharePercentage,
        price: input.price,
      },
    });
  }

  async cancelListing(playerId: string, listingId: string) {
    const listing = await this.prisma.client.companyShareListing.findUnique({ where: { id: listingId } });
    if (!listing || listing.sellerId !== playerId) {
      throw new ForbiddenException("Cette offre ne t'appartient pas");
    }
    if (listing.status !== "OPEN") {
      throw new BadRequestException("Cette offre n'est plus ouverte");
    }

    return this.prisma.client.companyShareListing.update({
      where: { id: listingId },
      data: { status: "CANCELLED" },
    });
  }

  async listMarketplace() {
    const listings = await this.prisma.client.companyShareListing.findMany({
      where: { status: "OPEN" },
      include: {
        seller: { select: { pseudo: true } },
        company: {
          include: { sector: true, municipality: true, cycleReports: CYCLE_REPORT_INCLUDE },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return listings.map((listing) => {
      const latestReport = listing.company.cycleReports[0];
      return {
        id: listing.id,
        sellerPseudo: listing.seller.pseudo,
        sharePercentage: listing.sharePercentage.toNumber(),
        price: listing.price.toNumber(),
        company: {
          id: listing.company.id,
          name: listing.company.name,
          sector: listing.company.sector.name,
          municipality: listing.company.municipality.name,
          attractivenessScore: this.computeAttractivenessBreakdown(listing.company).effective,
          latestNetProfitPerCycle: latestReport ? latestReport.profit.toNumber() - latestReport.taxPaid.toNumber() : null,
        },
      };
    });
  }

  async buyShareListing(playerId: string, listingId: string, input?: BuyShareListingInput) {
    const listing = await this.prisma.client.companyShareListing.findUnique({ where: { id: listingId } });
    if (!listing || listing.status !== "OPEN") {
      throw new NotFoundException("Cette offre n'est plus disponible");
    }
    if (listing.sellerId === playerId) {
      throw new BadRequestException("Tu ne peux pas acheter ta propre offre");
    }
    const acquirerCompanyId = input?.acquirerCompanyId;
    if (acquirerCompanyId) {
      await this.assertControlsCompany(playerId, acquirerCompanyId);
      await this.assertNoCircularHolding(acquirerCompanyId, listing.companyId);
    }

    if (acquirerCompanyId) {
      const acquirerCompany = await this.prisma.client.company.findUnique({ where: { id: acquirerCompanyId } });
      if (!acquirerCompany || acquirerCompany.cashReserve.toNumber() < listing.price.toNumber()) {
        throw new BadRequestException("Trésorerie insuffisante pour cet achat");
      }
    } else {
      const buyerStats = await this.prisma.client.playerStats.findUnique({ where: { playerId } });
      if (!buyerStats || buyerStats.wealthLiquid.toNumber() < listing.price.toNumber()) {
        throw new BadRequestException("Fonds insuffisants pour cet achat");
      }
    }

    const [company, currentCycle] = await Promise.all([
      this.prisma.client.company.findUniqueOrThrow({ where: { id: listing.companyId } }),
      this.cyclesService.getOrCreateOpenCycle(),
    ]);

    await this.prisma.client.$transaction(async (tx) => {
      // Reverrouille l'offre de façon atomique : si un autre joueur l'a
      // achetée entre-temps, ce update ne touche aucune ligne.
      const claimed = await tx.companyShareListing.updateMany({
        where: { id: listingId, status: "OPEN" },
        data: acquirerCompanyId
          ? { status: "SOLD", buyerCompanyId: acquirerCompanyId, soldAt: new Date() }
          : { status: "SOLD", buyerId: playerId, soldAt: new Date() },
      });
      if (claimed.count === 0) {
        throw new BadRequestException("Cette offre vient d'être achetée par quelqu'un d'autre");
      }

      if (acquirerCompanyId) {
        await tx.company.update({ where: { id: acquirerCompanyId }, data: { cashReserve: { decrement: listing.price } } });
      } else {
        await tx.playerStats.update({
          where: { playerId },
          data: { wealthLiquid: { decrement: listing.price } },
        });
      }
      await tx.playerStats.update({
        where: { playerId: listing.sellerId },
        data: { wealthLiquid: { increment: listing.price } },
      });

      const sellerShare = await tx.companyShare.findUniqueOrThrow({
        where: { companyId_playerId: { companyId: listing.companyId, playerId: listing.sellerId } },
      });
      const remaining = sellerShare.sharePercentage.toNumber() - listing.sharePercentage.toNumber();
      if (remaining <= 0) {
        await tx.companyShare.delete({
          where: { companyId_playerId: { companyId: listing.companyId, playerId: listing.sellerId } },
        });
      } else {
        await tx.companyShare.update({
          where: { companyId_playerId: { companyId: listing.companyId, playerId: listing.sellerId } },
          data: { sharePercentage: remaining },
        });
      }

      if (acquirerCompanyId) {
        await tx.companyShare.upsert({
          where: { companyId_holderCompanyId: { companyId: listing.companyId, holderCompanyId: acquirerCompanyId } },
          create: { companyId: listing.companyId, holderCompanyId: acquirerCompanyId, sharePercentage: listing.sharePercentage },
          update: { sharePercentage: { increment: listing.sharePercentage } },
        });
      } else {
        await tx.companyShare.upsert({
          where: { companyId_playerId: { companyId: listing.companyId, playerId } },
          create: { companyId: listing.companyId, playerId, sharePercentage: listing.sharePercentage },
          update: { sharePercentage: { increment: listing.sharePercentage } },
        });
      }

      await tx.playerNotification.create({
        data: {
          playerId: listing.sellerId,
          type: "share-sold",
          message: `${listing.sharePercentage.toNumber()}% de ${company.name} vendus pour ${listing.price.toNumber().toFixed(0)} €.`,
          cycle: currentCycle.number,
        },
      });
    });

    return { bought: true };
  }

  /**
   * Prêts entre joueurs (cf. domain/community-lending.ts) : une entreprise
   * prête sa trésorerie à un autre joueur, à un taux fixé librement par son
   * actionnaire principal (dans les bornes MIN/MAX_COMMUNITY_LOAN_RATE) —
   * une vraie alternative à la banque système (toujours SYSTEM pour les
   * hypothèques). Le montant déjà proposé sur d'autres offres ouvertes est
   * compté comme engagé, pour ne pas promettre plus que la trésorerie
   * disponible.
   */
  async createLoanOffer(playerId: string, companyId: string, input: CreateLoanOfferInput) {
    await this.assertPrimaryOwner(playerId, companyId);

    const company = await this.prisma.client.company.findUnique({ where: { id: companyId }, include: COMPANY_VIEW_INCLUDE });
    if (!company) {
      throw new NotFoundException("Entreprise introuvable");
    }

    const openOffers = await this.prisma.client.loanOffer.findMany({ where: { lenderCompanyId: companyId } });
    const committed = openOffers.reduce((sum, offer) => sum + offer.principal.toNumber(), 0);
    if (committed + input.principal > company.cashReserve.toNumber()) {
      throw new BadRequestException(
        `Trésorerie insuffisante — il reste ${(company.cashReserve.toNumber() - committed).toFixed(0)} € disponibles à prêter`,
      );
    }

    // Ratio de solvabilité (cf. domain/banking.ts SOLVENCY_RATIO_CAP) — au-delà
    // de la simple liquidité vérifiée ci-dessus, l'encours total prêté (offres
    // ouvertes + prêts déjà actifs) ne peut pas dépasser un multiple des fonds
    // propres RÉELS de la banque, pas seulement de sa trésorerie.
    const balanceSheet = this.computeBalanceSheetForCompany(company);
    const activeLoansAsLender = company.loansAsLender.reduce((sum, l) => sum + l.remainingBalance.toNumber(), 0);
    const maxLoanable = Math.max(0, balanceSheet.equity * SOLVENCY_RATIO_CAP);
    if (activeLoansAsLender + committed + input.principal > maxLoanable) {
      throw new BadRequestException(
        `Ratio de solvabilité dépassé — cette banque ne peut pas prêter plus de ${maxLoanable.toFixed(0)} € au total (${SOLVENCY_RATIO_CAP}x ses fonds propres de ${balanceSheet.equity.toFixed(0)} €), encours déjà engagé : ${(activeLoansAsLender + committed).toFixed(0)} €`,
      );
    }

    const currentCycle = await this.cyclesService.getOrCreateOpenCycle();
    return this.prisma.client.loanOffer.create({
      data: {
        lenderCompanyId: companyId,
        principal: input.principal,
        rate: input.rate,
        termCycles: input.termCycles,
        createdCycle: currentCycle.number,
      },
    });
  }

  async cancelLoanOffer(playerId: string, offerId: string) {
    const offer = await this.prisma.client.loanOffer.findUnique({ where: { id: offerId } });
    if (!offer) {
      throw new NotFoundException("Cette offre n'existe plus");
    }
    await this.assertPrimaryOwner(playerId, offer.lenderCompanyId);

    await this.prisma.client.loanOffer.delete({ where: { id: offerId } });
    return { cancelled: true };
  }

  async listLoanOffers() {
    const offers = await this.prisma.client.loanOffer.findMany({
      include: { lenderCompany: { include: { ...COMPANY_VIEW_INCLUDE, sector: true, municipality: true } } },
      orderBy: { rate: "asc" },
    });

    return offers.map((offer) => {
      const balanceSheet = this.computeBalanceSheetForCompany(offer.lenderCompany);
      const outstandingLoans = offer.lenderCompany.loansAsLender.reduce((sum, l) => sum + l.remainingBalance.toNumber(), 0);
      return {
        id: offer.id,
        principal: offer.principal.toNumber(),
        rate: offer.rate.toNumber(),
        termCycles: offer.termCycles,
        lenderCompany: {
          id: offer.lenderCompany.id,
          name: offer.lenderCompany.name,
          sector: offer.lenderCompany.sector.name,
          municipality: offer.lenderCompany.municipality.name,
          reliability: computeBankReliabilityRating(balanceSheet.equity, outstandingLoans),
        },
      };
    });
  }

  async takeLoanOffer(playerId: string, offerId: string) {
    const offer = await this.prisma.client.loanOffer.findUnique({
      where: { id: offerId },
      include: { lenderCompany: { include: { shares: true } } },
    });
    if (!offer) {
      throw new NotFoundException("Cette offre n'est plus disponible");
    }

    const primaryOwnerId = this.getPrimaryOwnerId(offer.lenderCompany.shares);
    if (primaryOwnerId === playerId) {
      throw new BadRequestException("Tu ne peux pas emprunter à ta propre entreprise");
    }

    const principal = offer.principal.toNumber();
    const currentCycle = await this.cyclesService.getOrCreateOpenCycle();

    await this.prisma.client.$transaction(async (tx) => {
      const claimed = await tx.loanOffer.deleteMany({ where: { id: offerId } });
      if (claimed.count === 0) {
        throw new BadRequestException("Cette offre vient d'être prise par quelqu'un d'autre");
      }

      const company = await tx.company.findUniqueOrThrow({ where: { id: offer.lenderCompanyId } });
      if (company.cashReserve.toNumber() < principal) {
        throw new BadRequestException("La trésorerie de cette entreprise ne couvre plus cette offre");
      }

      await tx.company.update({ where: { id: offer.lenderCompanyId }, data: { cashReserve: { decrement: principal } } });
      await tx.playerStats.update({ where: { playerId }, data: { wealthLiquid: { increment: principal } } });
      await tx.loan.create({
        data: {
          borrowerPlayerId: playerId,
          lenderType: "COMPANY",
          lenderCompanyId: offer.lenderCompanyId,
          principal,
          rate: offer.rate,
          termCycles: offer.termCycles,
          remainingBalance: principal,
        },
      });

      if (primaryOwnerId) {
        await tx.playerNotification.create({
          data: {
            playerId: primaryOwnerId,
            type: "loan-offer-taken",
            message: `Ton offre de prêt de ${principal.toFixed(0)} € (${company.name}) a été prise par un joueur.`,
            cycle: currentCycle.number,
          },
        });
      }
    });

    return { taken: true };
  }

  /**
   * Banques-joueurs (cf. domain/banking.ts) : n'importe quel joueur peut
   * déposer chez n'importe quelle entreprise, pas seulement la sienne — le
   * dépôt alimente directement cashReserve, augmentant d'autant sa capacité
   * de prêt réelle (même vérification déjà en place pour les offres de
   * prêt, jamais de ratio de solvabilité séparé à maintenir).
   */
  async deposit(playerId: string, companyId: string, input: DepositInput) {
    const [company, stats] = await Promise.all([
      this.prisma.client.company.findUnique({ where: { id: companyId } }),
      this.prisma.client.playerStats.findUnique({ where: { playerId } }),
    ]);
    if (!company || company.status !== "ACTIVE") {
      throw new NotFoundException("Entreprise introuvable");
    }
    if (!stats || stats.wealthLiquid.toNumber() < input.amount) {
      throw new BadRequestException("Fonds insuffisants pour ce dépôt");
    }

    const currentCycle = await this.cyclesService.getOrCreateOpenCycle();

    await this.prisma.client.$transaction(async (tx) => {
      await tx.playerStats.update({ where: { playerId }, data: { wealthLiquid: { decrement: input.amount } } });
      await tx.company.update({ where: { id: companyId }, data: { cashReserve: { increment: input.amount } } });
      await tx.bankDeposit.create({
        data: {
          playerId,
          companyId,
          principal: input.amount,
          balance: input.amount,
          rate: company.depositRate,
          depositedCycle: currentCycle.number,
        },
      });
    });

    return { deposited: input.amount, rate: company.depositRate.toNumber() };
  }

  /**
   * Retrait plafonné par la trésorerie réellement disponible de la banque —
   * si elle a trop prêté, le retrait échoue ou est partiel : la vraie
   * leçon de risque de liquidité, pas un simple solde toujours honoré.
   */
  async withdrawDeposit(playerId: string, depositId: string, input: WithdrawDepositInput) {
    const deposit = await this.prisma.client.bankDeposit.findUnique({ where: { id: depositId } });
    if (!deposit || deposit.playerId !== playerId || deposit.withdrawnCycle !== null) {
      throw new NotFoundException("Dépôt introuvable");
    }

    const company = await this.prisma.client.company.findUniqueOrThrow({ where: { id: deposit.companyId } });
    const balance = deposit.balance.toNumber();
    const requested = input.amount ?? balance;
    if (requested > balance + 0.01) {
      throw new BadRequestException("Solde insuffisant");
    }
    const available = company.cashReserve.toNumber();
    if (available < 0.01) {
      throw new BadRequestException(
        "Cette banque a prêté toute sa trésorerie disponible — réessaie plus tard, une fois qu'elle aura reconstitué ses réserves",
      );
    }
    const amount = Math.min(requested, available);
    const remaining = Math.max(0, balance - amount);
    const currentCycle = await this.cyclesService.getOrCreateOpenCycle();

    await this.prisma.client.$transaction(async (tx) => {
      await tx.playerStats.update({ where: { playerId }, data: { wealthLiquid: { increment: amount } } });
      await tx.company.update({ where: { id: deposit.companyId }, data: { cashReserve: { decrement: amount } } });
      await tx.bankDeposit.update({
        where: { id: depositId },
        data:
          remaining <= 0.01
            ? { balance: 0, withdrawnCycle: currentCycle.number }
            : { balance: remaining },
      });
    });

    return { withdrawn: amount, partial: amount < requested - 0.01 };
  }

  async setDepositRate(playerId: string, companyId: string, input: SetDepositRateInput) {
    await this.assertPrimaryOwner(playerId, companyId);
    await this.prisma.client.company.update({ where: { id: companyId }, data: { depositRate: input.rate } });
    return { rate: input.rate };
  }

  async listMyDeposits(playerId: string) {
    const deposits = await this.prisma.client.bankDeposit.findMany({
      where: { playerId, withdrawnCycle: null },
      include: { company: { select: { name: true, status: true } } },
      orderBy: { depositedCycle: "asc" },
    });

    return deposits.map((deposit) => ({
      id: deposit.id,
      companyId: deposit.companyId,
      companyName: deposit.company.name,
      companyActive: deposit.company.status === "ACTIVE",
      principal: deposit.principal.toNumber(),
      balance: deposit.balance.toNumber(),
      rate: deposit.rate.toNumber(),
      depositedCycle: deposit.depositedCycle,
    }));
  }

  /** Cote de fiabilité publique (cf. domain/banking.ts) — consultable avant de déposer ou d'emprunter. */
  async getBankReliability(companyId: string) {
    const company = await this.prisma.client.company.findUnique({ where: { id: companyId }, include: COMPANY_VIEW_INCLUDE });
    if (!company) {
      throw new NotFoundException("Entreprise introuvable");
    }
    const balanceSheet = this.computeBalanceSheetForCompany(company);
    const outstandingLoans = company.loansAsLender.reduce((sum, l) => sum + l.remainingBalance.toNumber(), 0);
    return {
      reliability: computeBankReliabilityRating(balanceSheet.equity, outstandingLoans),
      equity: balanceSheet.equity,
      outstandingLoans,
      solvencyCap: Math.max(0, balanceSheet.equity * SOLVENCY_RATIO_CAP),
    };
  }

  /**
   * Assurance inter-joueurs (cf. domain/insurance.ts) — une entreprise peut
   * publier une offre d'assurance (prime + plafond libres), une autre s'y
   * souscrit contre les pertes de ses futurs aléas d'entreprise négatifs
   * (cf. game-engine/cycles.ts, eventLossAmount). Une seule police active à
   * la fois par entreprise assurée.
   */
  async createInsuranceOffer(playerId: string, companyId: string, input: CreateInsuranceOfferInput) {
    await this.assertPrimaryOwner(playerId, companyId);
    const company = await this.prisma.client.company.findUnique({ where: { id: companyId } });
    if (!company || company.status !== "ACTIVE") {
      throw new NotFoundException("Entreprise introuvable");
    }

    const openCycle = await this.cyclesService.getOrCreateOpenCycle();
    return this.prisma.client.insurancePolicy.create({
      data: {
        insurerCompanyId: companyId,
        premiumPerCycle: input.premiumPerCycle,
        coverageCap: input.coverageCap,
        createdCycle: openCycle.number,
      },
    });
  }

  async cancelInsuranceOffer(playerId: string, offerId: string) {
    const offer = await this.prisma.client.insurancePolicy.findUnique({ where: { id: offerId } });
    if (!offer || !offer.insurerCompanyId) {
      throw new NotFoundException("Cette offre n'existe plus");
    }
    await this.assertPrimaryOwner(playerId, offer.insurerCompanyId);
    if (offer.status !== "OPEN") {
      throw new BadRequestException("Cette offre n'est plus ouverte");
    }

    await this.prisma.client.insurancePolicy.update({ where: { id: offerId }, data: { status: "CANCELLED" } });
    return { cancelled: true };
  }

  async listInsuranceOffers() {
    const offers = await this.prisma.client.insurancePolicy.findMany({
      where: { status: "OPEN" },
      include: { insurerCompany: { include: { sector: true, municipality: true } } },
      orderBy: { createdCycle: "desc" },
    });

    return offers
      .filter((offer) => offer.insurerCompany)
      .map((offer) => ({
        id: offer.id,
        premiumPerCycle: offer.premiumPerCycle.toNumber(),
        coverageCap: offer.coverageCap.toNumber(),
        insurerCompany: {
          id: offer.insurerCompany!.id,
          name: offer.insurerCompany!.name,
          sector: offer.insurerCompany!.sector.name,
          municipality: offer.insurerCompany!.municipality.name,
        },
      }));
  }

  private async assertNoActivePolicy(companyId: string) {
    const existing = await this.prisma.client.insurancePolicy.findFirst({
      where: { insuredCompanyId: companyId, status: "ACTIVE" },
    });
    if (existing) {
      throw new BadRequestException("Cette entreprise a déjà une police d'assurance active");
    }
  }

  async subscribeToInsuranceOffer(playerId: string, companyId: string, offerId: string) {
    await this.assertPrimaryOwner(playerId, companyId);
    await this.assertNoActivePolicy(companyId);

    const offer = await this.prisma.client.insurancePolicy.findUnique({ where: { id: offerId } });
    if (!offer || offer.status !== "OPEN" || !offer.insurerCompanyId) {
      throw new NotFoundException("Cette offre n'est plus disponible");
    }
    if (offer.insurerCompanyId === companyId) {
      throw new BadRequestException("Tu ne peux pas souscrire à ta propre offre");
    }

    const openCycle = await this.cyclesService.getOrCreateOpenCycle();
    const claimed = await this.prisma.client.insurancePolicy.updateMany({
      where: { id: offerId, status: "OPEN" },
      data: { status: "ACTIVE", insuredCompanyId: companyId, startedCycle: openCycle.number },
    });
    if (claimed.count === 0) {
      throw new BadRequestException("Cette offre vient d'être prise par quelqu'un d'autre");
    }

    const insurer = await this.prisma.client.company.findUnique({ where: { id: offer.insurerCompanyId } });
    const insurerShares = await this.prisma.client.companyShare.findMany({ where: { companyId: offer.insurerCompanyId } });
    const insurerOwnerId = this.getPrimaryOwnerId(insurerShares);
    if (insurerOwnerId && insurer) {
      await this.prisma.client.playerNotification.create({
        data: {
          playerId: insurerOwnerId,
          type: "insurance-offer-taken",
          message: `Ton offre d'assurance a été prise par une autre entreprise.`,
          cycle: openCycle.number,
        },
      });
    }

    return { subscribed: true };
  }

  async subscribeToSystemInsurance(playerId: string, companyId: string) {
    await this.assertPrimaryOwner(playerId, companyId);
    await this.assertNoActivePolicy(companyId);

    const openCycle = await this.cyclesService.getOrCreateOpenCycle();
    return this.prisma.client.insurancePolicy.create({
      data: {
        insuredCompanyId: companyId,
        premiumPerCycle: SYSTEM_INSURANCE_PREMIUM_PER_CYCLE,
        coverageCap: SYSTEM_INSURANCE_COVERAGE_CAP,
        status: "ACTIVE",
        createdCycle: openCycle.number,
        startedCycle: openCycle.number,
      },
    });
  }

  async cancelInsurancePolicy(playerId: string, companyId: string) {
    await this.assertPrimaryOwner(playerId, companyId);
    const { count } = await this.prisma.client.insurancePolicy.updateMany({
      where: { insuredCompanyId: companyId, status: "ACTIVE" },
      data: { status: "CANCELLED" },
    });
    return { cancelled: count > 0 };
  }

  async getCompanyInsurance(companyId: string) {
    const [policy, offersAsInsurer] = await Promise.all([
      this.prisma.client.insurancePolicy.findFirst({
        where: { insuredCompanyId: companyId, status: "ACTIVE" },
        include: { insurerCompany: { select: { name: true } } },
      }),
      this.prisma.client.insurancePolicy.findMany({
        where: { insurerCompanyId: companyId, status: { in: ["OPEN", "ACTIVE"] } },
        include: { insuredCompany: { select: { name: true } } },
      }),
    ]);

    return {
      activePolicy: policy
        ? {
            id: policy.id,
            premiumPerCycle: policy.premiumPerCycle.toNumber(),
            coverageCap: policy.coverageCap.toNumber(),
            insurerName: policy.insurerCompany?.name ?? "Assureur système",
            isSystem: !policy.insurerCompanyId,
            startedCycle: policy.startedCycle,
          }
        : null,
      offersAsInsurer: offersAsInsurer.map((offer) => ({
        id: offer.id,
        premiumPerCycle: offer.premiumPerCycle.toNumber(),
        coverageCap: offer.coverageCap.toNumber(),
        status: offer.status,
        insuredCompanyName: offer.insuredCompany?.name ?? null,
      })),
    };
  }

  /**
   * Rachat hostile d'entreprise (cf. domain/tender-offer.ts) — une OPA
   * ouverte à TOUS les actionnaires actuels, à la différence du marché
   * secondaire (companyShareListing) où seuls les vendeurs volontaires
   * proposent leurs parts. Le prix doit dépasser la valeur comptable par
   * part d'au moins MIN_TENDER_PREMIUM_RATIO — une vraie prime, pas un
   * rachat au rabais.
   */
  async launchTenderOffer(playerId: string, companyId: string, input: LaunchTenderOfferInput) {
    const company = await this.prisma.client.company.findUnique({ where: { id: companyId }, include: COMPANY_VIEW_INCLUDE });
    if (!company || company.status !== "ACTIVE") {
      throw new NotFoundException("Entreprise introuvable");
    }

    if (input.acquirerCompanyId) {
      await this.assertControlsCompany(playerId, input.acquirerCompanyId);
      await this.assertNoCircularHolding(input.acquirerCompanyId, companyId);
    }

    const existingOffer = await this.prisma.client.companyTenderOffer.findFirst({ where: { companyId, status: "OPEN" } });
    if (existingOffer) {
      throw new BadRequestException("Une offre de rachat est déjà ouverte sur cette entreprise");
    }

    const balanceSheet = this.computeBalanceSheetForCompany(company);
    const minPrice = Math.max(0, (balanceSheet.equity / 100) * MIN_TENDER_PREMIUM_RATIO);
    if (input.pricePerPercent < minPrice) {
      throw new BadRequestException(
        `Le prix proposé doit dépasser la valeur comptable par part d'au moins ${((MIN_TENDER_PREMIUM_RATIO - 1) * 100).toFixed(0)}% — minimum ${minPrice.toFixed(2)} € par 1%`,
      );
    }

    const currentCycle = await this.cyclesService.getOrCreateOpenCycle();
    return this.prisma.client.companyTenderOffer.create({
      data: {
        companyId,
        acquirerPlayerId: input.acquirerCompanyId ? null : playerId,
        acquirerCompanyId: input.acquirerCompanyId ?? null,
        pricePerPercent: input.pricePerPercent,
        createdCycle: currentCycle.number,
        expiresCycle: currentCycle.number + TENDER_OFFER_DURATION_CYCLES,
      },
    });
  }

  async cancelTenderOffer(playerId: string, offerId: string) {
    const offer = await this.prisma.client.companyTenderOffer.findUnique({ where: { id: offerId } });
    if (!offer) {
      throw new ForbiddenException("Cette offre ne t'appartient pas");
    }
    const isAcquirer = offer.acquirerPlayerId
      ? offer.acquirerPlayerId === playerId
      : offer.acquirerCompanyId
        ? await this.controlsCompany(playerId, offer.acquirerCompanyId)
        : false;
    if (!isAcquirer) {
      throw new ForbiddenException("Cette offre ne t'appartient pas");
    }
    if (offer.status !== "OPEN") {
      throw new BadRequestException("Cette offre n'est plus ouverte");
    }

    await this.prisma.client.companyTenderOffer.update({ where: { id: offerId }, data: { status: "CANCELLED" } });
    return { cancelled: true };
  }

  async listTenderOffers(companyId?: string) {
    const currentCycle = await this.cyclesService.getOrCreateOpenCycle();

    const expired = await this.prisma.client.companyTenderOffer.findMany({
      where: { status: "OPEN", expiresCycle: { lt: currentCycle.number }, ...(companyId ? { companyId } : {}) },
    });
    if (expired.length > 0) {
      await this.prisma.client.companyTenderOffer.updateMany({
        where: { id: { in: expired.map((o) => o.id) } },
        data: { status: "CANCELLED" },
      });
    }

    const offers = await this.prisma.client.companyTenderOffer.findMany({
      where: { status: "OPEN", ...(companyId ? { companyId } : {}) },
      include: { company: { include: { sector: true, municipality: true } } },
      orderBy: { createdCycle: "desc" },
    });

    const [acquirers, acquirerCompanies] = await Promise.all([
      this.prisma.client.player.findMany({
        where: { id: { in: offers.map((o) => o.acquirerPlayerId).filter((id): id is string => !!id) } },
        select: { id: true, pseudo: true },
      }),
      this.prisma.client.company.findMany({
        where: { id: { in: offers.map((o) => o.acquirerCompanyId).filter((id): id is string => !!id) } },
        select: { id: true, name: true },
      }),
    ]);
    const pseudoById = new Map(acquirers.map((p) => [p.id, p.pseudo]));
    const companyNameById = new Map(acquirerCompanies.map((c) => [c.id, c.name]));

    return offers.map((offer) => ({
      id: offer.id,
      companyId: offer.companyId,
      companyName: offer.company.name,
      sector: offer.company.sector.name,
      municipality: offer.company.municipality.name,
      acquirerPseudo: offer.acquirerPlayerId
        ? (pseudoById.get(offer.acquirerPlayerId) ?? "?")
        : `🏢 ${companyNameById.get(offer.acquirerCompanyId!) ?? "?"}`,
      pricePerPercent: offer.pricePerPercent.toNumber(),
      createdCycle: offer.createdCycle,
      expiresCycle: offer.expiresCycle,
      cyclesRemaining: Math.max(0, offer.expiresCycle - currentCycle.number),
    }));
  }

  async tenderShares(playerId: string, offerId: string, input: TenderSharesInput) {
    const offer = await this.prisma.client.companyTenderOffer.findUnique({ where: { id: offerId } });
    if (!offer || offer.status !== "OPEN") {
      throw new NotFoundException("Cette offre n'est plus disponible");
    }

    const currentCycle = await this.cyclesService.getOrCreateOpenCycle();
    if (offer.expiresCycle < currentCycle.number) {
      await this.prisma.client.companyTenderOffer.update({ where: { id: offerId }, data: { status: "CANCELLED" } });
      throw new BadRequestException("Cette offre a expiré");
    }
    const acquirerIsSelf = offer.acquirerPlayerId
      ? offer.acquirerPlayerId === playerId
      : offer.acquirerCompanyId
        ? await this.controlsCompany(playerId, offer.acquirerCompanyId)
        : false;
    if (acquirerIsSelf) {
      throw new BadRequestException("Tu ne peux pas répondre à ta propre offre");
    }

    const share = await this.prisma.client.companyShare.findUnique({
      where: { companyId_playerId: { companyId: offer.companyId, playerId } },
    });
    if (!share || share.sharePercentage.toNumber() < input.percentage) {
      throw new BadRequestException("Tu ne possèdes pas assez de parts pour cette cession");
    }

    const totalPrice = offer.pricePerPercent.toNumber() * input.percentage;
    let acquirerUltimateControllerId: string | undefined;
    if (offer.acquirerPlayerId) {
      const acquirerStats = await this.prisma.client.playerStats.findUnique({ where: { playerId: offer.acquirerPlayerId } });
      if (!acquirerStats || acquirerStats.wealthLiquid.toNumber() < totalPrice) {
        throw new BadRequestException("L'acquéreur n'a plus les fonds pour honorer cette offre");
      }
      acquirerUltimateControllerId = offer.acquirerPlayerId;
    } else if (offer.acquirerCompanyId) {
      const acquirerCompany = await this.prisma.client.company.findUnique({ where: { id: offer.acquirerCompanyId } });
      if (!acquirerCompany || acquirerCompany.cashReserve.toNumber() < totalPrice) {
        throw new BadRequestException("L'entreprise acquéreuse n'a plus la trésorerie pour honorer cette offre");
      }
      const acquirerShares = await this.prisma.client.companyShare.findMany({ where: { companyId: offer.acquirerCompanyId } });
      acquirerUltimateControllerId = await this.resolveUltimateControllerId(acquirerShares);
    }

    const company = await this.prisma.client.company.findUniqueOrThrow({
      where: { id: offer.companyId },
      include: { shares: true },
    });
    const previousPrimaryOwnerId = await this.resolveUltimateControllerId(company.shares);

    await this.prisma.client.$transaction(async (tx) => {
      if (offer.acquirerPlayerId) {
        await tx.playerStats.update({ where: { playerId: offer.acquirerPlayerId }, data: { wealthLiquid: { decrement: totalPrice } } });
      } else if (offer.acquirerCompanyId) {
        await tx.company.update({ where: { id: offer.acquirerCompanyId }, data: { cashReserve: { decrement: totalPrice } } });
      }
      await tx.playerStats.update({ where: { playerId }, data: { wealthLiquid: { increment: totalPrice } } });

      const sellerShare = await tx.companyShare.findUniqueOrThrow({
        where: { companyId_playerId: { companyId: offer.companyId, playerId } },
      });
      const remaining = sellerShare.sharePercentage.toNumber() - input.percentage;
      if (remaining <= 0) {
        await tx.companyShare.delete({ where: { companyId_playerId: { companyId: offer.companyId, playerId } } });
      } else {
        await tx.companyShare.update({
          where: { companyId_playerId: { companyId: offer.companyId, playerId } },
          data: { sharePercentage: remaining },
        });
      }

      if (offer.acquirerPlayerId) {
        await tx.companyShare.upsert({
          where: { companyId_playerId: { companyId: offer.companyId, playerId: offer.acquirerPlayerId } },
          create: { companyId: offer.companyId, playerId: offer.acquirerPlayerId, sharePercentage: input.percentage },
          update: { sharePercentage: { increment: input.percentage } },
        });
      } else if (offer.acquirerCompanyId) {
        await tx.companyShare.upsert({
          where: { companyId_holderCompanyId: { companyId: offer.companyId, holderCompanyId: offer.acquirerCompanyId } },
          create: { companyId: offer.companyId, holderCompanyId: offer.acquirerCompanyId, sharePercentage: input.percentage },
          update: { sharePercentage: { increment: input.percentage } },
        });
      }

      const updatedShares = await tx.companyShare.findMany({ where: { companyId: offer.companyId } });
      const newPrimaryOwnerId = await this.resolveUltimateControllerId(updatedShares);
      const acquirerShare = updatedShares.find((s) =>
        offer.acquirerPlayerId ? s.playerId === offer.acquirerPlayerId : s.holderCompanyId === offer.acquirerCompanyId,
      );
      if ((acquirerShare?.sharePercentage.toNumber() ?? 0) >= 99.99) {
        await tx.companyTenderOffer.update({ where: { id: offerId }, data: { status: "COMPLETED" } });
      }

      await tx.playerNotification.create({
        data: {
          playerId,
          type: "share-sold",
          message: `${input.percentage}% de ${company.name} vendus pour ${totalPrice.toFixed(0)} € (OPA).`,
          cycle: currentCycle.number,
        },
      });

      if (newPrimaryOwnerId !== previousPrimaryOwnerId && newPrimaryOwnerId === acquirerUltimateControllerId && previousPrimaryOwnerId) {
        await tx.playerNotification.create({
          data: {
            playerId: previousPrimaryOwnerId,
            type: "hostile-takeover",
            message: `${company.name} a changé de mains : un actionnaire en a pris le contrôle via une OPA.`,
            cycle: currentCycle.number,
          },
        });
        await tx.pressArticle.create({
          data: {
            category: "HOSTILE_TAKEOVER",
            headline: `${company.name} change de mains suite à une offre publique d'achat.`,
            cycle: currentCycle.number,
          },
        });
      }
    });

    return { tendered: true };
  }

  /**
   * Rachat AMICAL d'entreprise (cf. domain/friendly-sale.ts) — négociation
   * privée directe : le VENDEUR ouvre l'annonce (à la différence de l'OPA
   * où c'est l'acheteur), plusieurs acheteurs soumettent chacun leur propre
   * offre (visibles seulement du vendeur), qui choisit librement laquelle
   * accepter — pas de prime minimale imposée, une vente volontaire peut se
   * faire à n'importe quel prix.
   */
  async createSaleListing(playerId: string, companyId: string, input: CreateSaleListingInput) {
    await this.assertPrimaryOwner(playerId, companyId);
    const share = await this.prisma.client.companyShare.findUnique({
      where: { companyId_playerId: { companyId, playerId } },
    });
    if (!share || share.sharePercentage.toNumber() < input.sharePercentage) {
      throw new BadRequestException("Tu ne possèdes pas assez de parts pour cette annonce");
    }
    const existing = await this.prisma.client.companySaleListing.findFirst({ where: { companyId, status: "OPEN" } });
    if (existing) {
      throw new BadRequestException("Une annonce de vente est déjà ouverte sur cette entreprise");
    }

    const currentCycle = await this.cyclesService.getOrCreateOpenCycle();
    return this.prisma.client.companySaleListing.create({
      data: {
        companyId,
        sellerId: playerId,
        sharePercentage: input.sharePercentage,
        askingPricePerPercent: input.askingPricePerPercent,
        createdCycle: currentCycle.number,
        expiresCycle: currentCycle.number + SALE_LISTING_DURATION_CYCLES,
      },
    });
  }

  async cancelSaleListing(playerId: string, listingId: string) {
    const listing = await this.prisma.client.companySaleListing.findUnique({ where: { id: listingId } });
    if (!listing || listing.sellerId !== playerId) {
      throw new ForbiddenException("Cette annonce ne t'appartient pas");
    }
    if (listing.status !== "OPEN") {
      throw new BadRequestException("Cette annonce n'est plus ouverte");
    }

    await this.prisma.client.companySaleListing.update({ where: { id: listingId }, data: { status: "CANCELLED" } });
    await this.prisma.client.companySaleBid.updateMany({
      where: { listingId, status: "PENDING" },
      data: { status: "REJECTED" },
    });
    return { cancelled: true };
  }

  async listSaleListings() {
    const currentCycle = await this.cyclesService.getOrCreateOpenCycle();

    const expired = await this.prisma.client.companySaleListing.findMany({
      where: { status: "OPEN", expiresCycle: { lt: currentCycle.number } },
    });
    if (expired.length > 0) {
      await this.prisma.client.companySaleListing.updateMany({
        where: { id: { in: expired.map((l) => l.id) } },
        data: { status: "CANCELLED" },
      });
    }

    const listings = await this.prisma.client.companySaleListing.findMany({
      where: { status: "OPEN" },
      include: { company: { include: { sector: true, municipality: true } }, bids: { where: { status: "PENDING" } } },
      orderBy: { createdCycle: "desc" },
    });

    return listings.map((listing) => ({
      id: listing.id,
      companyId: listing.companyId,
      companyName: listing.company.name,
      sector: listing.company.sector.name,
      municipality: listing.company.municipality.name,
      sharePercentage: listing.sharePercentage.toNumber(),
      askingPricePerPercent: listing.askingPricePerPercent?.toNumber() ?? null,
      bidCount: listing.bids.length,
      createdCycle: listing.createdCycle,
      expiresCycle: listing.expiresCycle,
      cyclesRemaining: Math.max(0, listing.expiresCycle - currentCycle.number),
    }));
  }

  async submitSaleBid(playerId: string, listingId: string, input: SubmitSaleBidInput) {
    const listing = await this.prisma.client.companySaleListing.findUnique({ where: { id: listingId } });
    if (!listing || listing.status !== "OPEN") {
      throw new NotFoundException("Cette annonce n'est plus disponible");
    }

    const currentCycle = await this.cyclesService.getOrCreateOpenCycle();
    if (listing.expiresCycle < currentCycle.number) {
      await this.prisma.client.companySaleListing.update({ where: { id: listingId }, data: { status: "CANCELLED" } });
      throw new BadRequestException("Cette annonce a expiré");
    }
    if (listing.sellerId === playerId) {
      throw new BadRequestException("Tu ne peux pas enchérir sur ta propre annonce");
    }
    if (input.buyerCompanyId) {
      await this.assertControlsCompany(playerId, input.buyerCompanyId);
      await this.assertNoCircularHolding(input.buyerCompanyId, listing.companyId);
    }

    const existingBid = await this.prisma.client.companySaleBid.findFirst({
      where: input.buyerCompanyId
        ? { listingId, buyerCompanyId: input.buyerCompanyId, status: "PENDING" }
        : { listingId, buyerId: playerId, status: "PENDING" },
    });
    if (existingBid) {
      await this.prisma.client.companySaleBid.update({
        where: { id: existingBid.id },
        data: { pricePerPercent: input.pricePerPercent },
      });
      return { submitted: true };
    }

    await this.prisma.client.companySaleBid.create({
      data: {
        listingId,
        buyerId: input.buyerCompanyId ? null : playerId,
        buyerCompanyId: input.buyerCompanyId ?? null,
        pricePerPercent: input.pricePerPercent,
        createdCycle: currentCycle.number,
      },
    });
    await this.prisma.client.playerNotification.create({
      data: {
        playerId: listing.sellerId,
        type: "sale-bid-received",
        message: `Nouvelle offre reçue pour la vente de tes parts.`,
        cycle: currentCycle.number,
      },
    });

    return { submitted: true };
  }

  async cancelSaleBid(playerId: string, bidId: string) {
    const bid = await this.prisma.client.companySaleBid.findUnique({ where: { id: bidId } });
    if (!bid) {
      throw new ForbiddenException("Cette offre ne t'appartient pas");
    }
    const isBuyer = bid.buyerId ? bid.buyerId === playerId : bid.buyerCompanyId ? await this.controlsCompany(playerId, bid.buyerCompanyId) : false;
    if (!isBuyer) {
      throw new ForbiddenException("Cette offre ne t'appartient pas");
    }
    if (bid.status !== "PENDING") {
      throw new BadRequestException("Cette offre n'est plus en attente");
    }
    await this.prisma.client.companySaleBid.update({ where: { id: bidId }, data: { status: "WITHDRAWN" } });
    return { cancelled: true };
  }

  /** Vue privée réservée au vendeur — c'est ça, la "négociation privée" : les acheteurs ne voient jamais les offres des autres. */
  async listSaleBids(playerId: string, listingId: string) {
    const listing = await this.prisma.client.companySaleListing.findUnique({ where: { id: listingId } });
    if (!listing || listing.sellerId !== playerId) {
      throw new ForbiddenException("Cette annonce ne t'appartient pas");
    }

    const bids = await this.prisma.client.companySaleBid.findMany({
      where: { listingId, status: "PENDING" },
      orderBy: { pricePerPercent: "desc" },
    });
    const [buyers, buyerCompanies] = await Promise.all([
      this.prisma.client.player.findMany({
        where: { id: { in: bids.map((b) => b.buyerId).filter((id): id is string => !!id) } },
        select: { id: true, pseudo: true },
      }),
      this.prisma.client.company.findMany({
        where: { id: { in: bids.map((b) => b.buyerCompanyId).filter((id): id is string => !!id) } },
        select: { id: true, name: true },
      }),
    ]);
    const pseudoById = new Map(buyers.map((p) => [p.id, p.pseudo]));
    const companyNameById = new Map(buyerCompanies.map((c) => [c.id, c.name]));

    return bids.map((bid) => ({
      id: bid.id,
      buyerPseudo: bid.buyerId ? (pseudoById.get(bid.buyerId) ?? "?") : `🏢 ${companyNameById.get(bid.buyerCompanyId!) ?? "?"}`,
      pricePerPercent: bid.pricePerPercent.toNumber(),
      totalPrice: bid.pricePerPercent.toNumber() * listing.sharePercentage.toNumber(),
      createdCycle: bid.createdCycle,
    }));
  }

  async acceptSaleBid(playerId: string, bidId: string) {
    const bid = await this.prisma.client.companySaleBid.findUnique({ where: { id: bidId } });
    if (!bid || bid.status !== "PENDING") {
      throw new NotFoundException("Cette offre n'est plus disponible");
    }
    const listing = await this.prisma.client.companySaleListing.findUnique({ where: { id: bid.listingId } });
    if (!listing || listing.sellerId !== playerId || listing.status !== "OPEN") {
      throw new ForbiddenException("Cette annonce ne t'appartient pas");
    }

    const totalPrice = bid.pricePerPercent.toNumber() * listing.sharePercentage.toNumber();
    if (bid.buyerId) {
      const buyerStats = await this.prisma.client.playerStats.findUnique({ where: { playerId: bid.buyerId } });
      if (!buyerStats || buyerStats.wealthLiquid.toNumber() < totalPrice) {
        throw new BadRequestException("L'acheteur n'a plus les fonds pour honorer cette offre");
      }
    } else if (bid.buyerCompanyId) {
      const buyerCompany = await this.prisma.client.company.findUnique({ where: { id: bid.buyerCompanyId } });
      if (!buyerCompany || buyerCompany.cashReserve.toNumber() < totalPrice) {
        throw new BadRequestException("L'entreprise acheteuse n'a plus la trésorerie pour honorer cette offre");
      }
    }

    const sellerShare = await this.prisma.client.companyShare.findUnique({
      where: { companyId_playerId: { companyId: listing.companyId, playerId } },
    });
    if (!sellerShare || sellerShare.sharePercentage.toNumber() < listing.sharePercentage.toNumber()) {
      throw new BadRequestException("Tu ne possèdes plus assez de parts pour cette vente");
    }

    const company = await this.prisma.client.company.findUniqueOrThrow({ where: { id: listing.companyId } });
    const currentCycle = await this.cyclesService.getOrCreateOpenCycle();

    await this.prisma.client.$transaction(async (tx) => {
      const claimed = await tx.companySaleListing.updateMany({
        where: { id: listing.id, status: "OPEN" },
        data: { status: "SOLD" },
      });
      if (claimed.count === 0) {
        throw new BadRequestException("Cette annonce n'est plus disponible");
      }

      if (bid.buyerId) {
        await tx.playerStats.update({ where: { playerId: bid.buyerId }, data: { wealthLiquid: { decrement: totalPrice } } });
      } else if (bid.buyerCompanyId) {
        await tx.company.update({ where: { id: bid.buyerCompanyId }, data: { cashReserve: { decrement: totalPrice } } });
      }
      await tx.playerStats.update({ where: { playerId }, data: { wealthLiquid: { increment: totalPrice } } });

      const remaining = sellerShare.sharePercentage.toNumber() - listing.sharePercentage.toNumber();
      if (remaining <= 0) {
        await tx.companyShare.delete({ where: { companyId_playerId: { companyId: listing.companyId, playerId } } });
      } else {
        await tx.companyShare.update({
          where: { companyId_playerId: { companyId: listing.companyId, playerId } },
          data: { sharePercentage: remaining },
        });
      }
      if (bid.buyerId) {
        await tx.companyShare.upsert({
          where: { companyId_playerId: { companyId: listing.companyId, playerId: bid.buyerId } },
          create: { companyId: listing.companyId, playerId: bid.buyerId, sharePercentage: listing.sharePercentage },
          update: { sharePercentage: { increment: listing.sharePercentage } },
        });
      } else if (bid.buyerCompanyId) {
        await tx.companyShare.upsert({
          where: { companyId_holderCompanyId: { companyId: listing.companyId, holderCompanyId: bid.buyerCompanyId } },
          create: { companyId: listing.companyId, holderCompanyId: bid.buyerCompanyId, sharePercentage: listing.sharePercentage },
          update: { sharePercentage: { increment: listing.sharePercentage } },
        });
      }

      await tx.companySaleBid.update({ where: { id: bid.id }, data: { status: "ACCEPTED" } });

      const bidsToReject = await tx.companySaleBid.findMany({ where: { listingId: listing.id, status: "PENDING" } });
      if (bidsToReject.length > 0) {
        await tx.companySaleBid.updateMany({
          where: { id: { in: bidsToReject.map((b) => b.id) } },
          data: { status: "REJECTED" },
        });
        for (const rejected of bidsToReject) {
          const rejectedPlayerId = rejected.buyerId ?? (await this.resolveUltimateControllerId(
            await tx.companyShare.findMany({ where: { companyId: rejected.buyerCompanyId! } }),
          ));
          if (!rejectedPlayerId) continue;
          await tx.playerNotification.create({
            data: {
              playerId: rejectedPlayerId,
              type: "sale-bid-rejected",
              message: `Ton offre pour ${company.name} n'a pas été retenue par le vendeur.`,
              cycle: currentCycle.number,
            },
          });
        }
      }

      const acceptedPlayerId = bid.buyerId ?? (await this.resolveUltimateControllerId(
        await tx.companyShare.findMany({ where: { companyId: bid.buyerCompanyId! } }),
      ));
      if (acceptedPlayerId) {
        await tx.playerNotification.create({
          data: {
            playerId: acceptedPlayerId,
            type: "sale-bid-accepted",
            message: `Ton offre de ${totalPrice.toFixed(0)} € pour ${listing.sharePercentage.toNumber()}% de ${company.name} a été acceptée.`,
            cycle: currentCycle.number,
          },
        });
      }
    });

    return { accepted: true };
  }

  /**
   * Capital-risque entre joueurs (cf. domain/venture-capital.ts) — à la
   * différence de tous les autres mécanismes d'actionnariat déjà en place
   * (marché secondaire, OPA, rachat amical), l'argent va dans la
   * trésorerie RÉELLE de l'entreprise et de NOUVELLES parts sont émises
   * pour l'investisseur, diluant mécaniquement tous les actionnaires
   * existants (cf. game-engine, computeDilutedSharePercentage).
   */
  async createCapitalRaise(playerId: string, companyId: string, input: CreateCapitalRaiseInput) {
    await this.assertPrimaryOwner(playerId, companyId);
    const company = await this.prisma.client.company.findUnique({ where: { id: companyId } });
    if (!company || company.status !== "ACTIVE") {
      throw new NotFoundException("Entreprise introuvable");
    }
    const existing = await this.prisma.client.companyCapitalRaise.findFirst({ where: { companyId, status: "OPEN" } });
    if (existing) {
      throw new BadRequestException("Une levée de fonds est déjà ouverte sur cette entreprise");
    }

    const currentCycle = await this.cyclesService.getOrCreateOpenCycle();
    return this.prisma.client.companyCapitalRaise.create({
      data: {
        companyId,
        targetAmount: input.targetAmount,
        newSharePercentage: input.newSharePercentage,
        createdCycle: currentCycle.number,
        expiresCycle: currentCycle.number + CAPITAL_RAISE_DURATION_CYCLES,
      },
    });
  }

  async cancelCapitalRaise(playerId: string, raiseId: string) {
    const raise = await this.prisma.client.companyCapitalRaise.findUnique({ where: { id: raiseId } });
    if (!raise) {
      throw new NotFoundException("Cette levée de fonds n'existe plus");
    }
    await this.assertPrimaryOwner(playerId, raise.companyId);
    if (raise.status !== "OPEN") {
      throw new BadRequestException("Cette levée de fonds n'est plus ouverte");
    }

    await this.prisma.client.companyCapitalRaise.update({ where: { id: raiseId }, data: { status: "CANCELLED" } });
    return { cancelled: true };
  }

  async listCapitalRaises() {
    const currentCycle = await this.cyclesService.getOrCreateOpenCycle();

    const expired = await this.prisma.client.companyCapitalRaise.findMany({
      where: { status: "OPEN", expiresCycle: { lt: currentCycle.number } },
    });
    if (expired.length > 0) {
      await this.prisma.client.companyCapitalRaise.updateMany({
        where: { id: { in: expired.map((r) => r.id) } },
        data: { status: "CANCELLED" },
      });
    }

    const raises = await this.prisma.client.companyCapitalRaise.findMany({
      where: { status: "OPEN" },
      include: { company: { include: { sector: true, municipality: true } } },
      orderBy: { createdCycle: "desc" },
    });

    return raises.map((raise) => ({
      id: raise.id,
      companyId: raise.companyId,
      companyName: raise.company.name,
      sector: raise.company.sector.name,
      municipality: raise.company.municipality.name,
      targetAmount: raise.targetAmount.toNumber(),
      newSharePercentage: raise.newSharePercentage.toNumber(),
      createdCycle: raise.createdCycle,
      expiresCycle: raise.expiresCycle,
      cyclesRemaining: Math.max(0, raise.expiresCycle - currentCycle.number),
      // Due diligence — de quoi juger le pari avant de financer à l'aveugle :
      // ancienneté, rentabilité cumulée depuis la fondation, trésorerie
      // actuelle, et le score compétitif utilisé pour l'attractivité.
      companyAgeCycles: currentCycle.number - raise.company.foundedCycle,
      cumulativeNetProfit: raise.company.cumulativeNetProfit.toNumber(),
      cashReserve: raise.company.cashReserve.toNumber(),
      attractivenessScore: this.computeAttractivenessBreakdown(raise.company).effective,
      amountRaised: raise.amountRaised.toNumber(),
      remainingAmount: Math.max(0, raise.targetAmount.toNumber() - raise.amountRaised.toNumber()),
    }));
  }

  async getCapitalRaiseContributions(raiseId: string) {
    const contributions = await this.prisma.client.capitalRaiseContribution.findMany({
      where: { raiseId },
      include: { investor: { select: { pseudo: true } }, investorCompany: { select: { name: true } } },
      orderBy: { cycle: "asc" },
    });
    return contributions.map((c) => ({
      investorPseudo: c.investor?.pseudo ?? `🏢 ${c.investorCompany?.name ?? "?"}`,
      amount: c.amount.toNumber(),
      sharePercentage: c.sharePercentage.toNumber(),
      cycle: c.cycle,
    }));
  }

  /**
   * Financement partiel : plusieurs investisseurs peuvent chacun combler une
   * partie du montant cible, au lieu d'un seul qui rafle tout en premier. La
   * part de nouvelles actions attribuée est proportionnelle à la fraction du
   * montant cible que CETTE contribution représente — un investisseur qui
   * apporte 20% du montant cible reçoit 20% des nouvelles parts offertes,
   * pas une part égale entre investisseurs. Le tour passe FUNDED dès que le
   * cumul atteint le montant cible (verrou optimiste sur amountRaised pour
   * éviter un dépassement si deux contributions arrivent en même temps).
   */
  async contributeToCapitalRaise(playerId: string, raiseId: string, input: ContributeToCapitalRaiseInput) {
    const raise = await this.prisma.client.companyCapitalRaise.findUnique({ where: { id: raiseId } });
    if (!raise || raise.status !== "OPEN") {
      throw new NotFoundException("Cette levée de fonds n'est plus disponible");
    }

    const currentCycle = await this.cyclesService.getOrCreateOpenCycle();
    if (raise.expiresCycle < currentCycle.number) {
      await this.prisma.client.companyCapitalRaise.update({ where: { id: raiseId }, data: { status: "CANCELLED" } });
      throw new BadRequestException("Cette levée de fonds a expiré");
    }

    const company = await this.prisma.client.company.findUniqueOrThrow({
      where: { id: raise.companyId },
      include: { shares: true },
    });
    const previousPrimaryOwnerId = await this.resolveUltimateControllerId(company.shares);
    if (input.investorCompanyId) {
      await this.assertControlsCompany(playerId, input.investorCompanyId);
      await this.assertNoCircularHolding(input.investorCompanyId, raise.companyId);
    } else if (previousPrimaryOwnerId === playerId) {
      throw new BadRequestException("Tu ne peux pas financer ta propre levée de fonds");
    }

    const targetAmount = raise.targetAmount.toNumber();
    const alreadyRaised = raise.amountRaised.toNumber();
    const remaining = targetAmount - alreadyRaised;
    if (remaining <= 0.01) {
      throw new BadRequestException("Cette levée de fonds est déjà entièrement financée");
    }
    const amount = Math.min(input.amount, remaining);

    if (input.investorCompanyId) {
      const investorCompany = await this.prisma.client.company.findUnique({ where: { id: input.investorCompanyId } });
      if (!investorCompany || investorCompany.cashReserve.toNumber() < amount) {
        throw new BadRequestException("Trésorerie insuffisante pour ce montant");
      }
    } else {
      const investorStats = await this.prisma.client.playerStats.findUnique({ where: { playerId } });
      if (!investorStats || investorStats.wealthLiquid.toNumber() < amount) {
        throw new BadRequestException("Fonds insuffisants pour ce montant");
      }
    }

    const newSharePercentage = raise.newSharePercentage.toNumber();
    const shareForContribution = newSharePercentage * (amount / targetAmount);
    const newAmountRaised = alreadyRaised + amount;
    const isFullyFunded = newAmountRaised >= targetAmount - 0.01;

    await this.prisma.client.$transaction(async (tx) => {
      const claimed = await tx.companyCapitalRaise.updateMany({
        where: { id: raiseId, status: "OPEN", amountRaised: raise.amountRaised },
        data: { amountRaised: newAmountRaised, status: isFullyFunded ? "FUNDED" : "OPEN" },
      });
      if (claimed.count === 0) {
        throw new BadRequestException("Cette levée de fonds vient de changer, réessaie");
      }

      if (input.investorCompanyId) {
        await tx.company.update({ where: { id: input.investorCompanyId }, data: { cashReserve: { decrement: amount } } });
      } else {
        await tx.playerStats.update({ where: { playerId }, data: { wealthLiquid: { decrement: amount } } });
      }
      await tx.company.update({ where: { id: raise.companyId }, data: { cashReserve: { increment: amount } } });

      for (const existingShare of company.shares) {
        await tx.companyShare.update({
          where: existingShare.playerId
            ? { companyId_playerId: { companyId: raise.companyId, playerId: existingShare.playerId } }
            : { companyId_holderCompanyId: { companyId: raise.companyId, holderCompanyId: existingShare.holderCompanyId! } },
          data: {
            sharePercentage: computeDilutedSharePercentage(
              existingShare.sharePercentage.toNumber(),
              shareForContribution,
            ),
          },
        });
      }
      if (input.investorCompanyId) {
        await tx.companyShare.upsert({
          where: { companyId_holderCompanyId: { companyId: raise.companyId, holderCompanyId: input.investorCompanyId } },
          create: { companyId: raise.companyId, holderCompanyId: input.investorCompanyId, sharePercentage: shareForContribution },
          update: { sharePercentage: { increment: shareForContribution } },
        });
        await tx.capitalRaiseContribution.upsert({
          where: { raiseId_investorCompanyId: { raiseId, investorCompanyId: input.investorCompanyId } },
          create: {
            raiseId,
            investorCompanyId: input.investorCompanyId,
            amount,
            sharePercentage: shareForContribution,
            cycle: currentCycle.number,
          },
          update: {
            amount: { increment: amount },
            sharePercentage: { increment: shareForContribution },
          },
        });
      } else {
        await tx.companyShare.upsert({
          where: { companyId_playerId: { companyId: raise.companyId, playerId } },
          create: { companyId: raise.companyId, playerId, sharePercentage: shareForContribution },
          update: { sharePercentage: { increment: shareForContribution } },
        });
        await tx.capitalRaiseContribution.upsert({
          where: { raiseId_investorId: { raiseId, investorId: playerId } },
          create: {
            raiseId,
            investorId: playerId,
            amount,
            sharePercentage: shareForContribution,
            cycle: currentCycle.number,
          },
          update: {
            amount: { increment: amount },
            sharePercentage: { increment: shareForContribution },
          },
        });
      }

      if (previousPrimaryOwnerId) {
        await tx.playerNotification.create({
          data: {
            playerId: previousPrimaryOwnerId,
            type: "capital-raise-funded",
            message: isFullyFunded
              ? `${company.name} a levé ${targetAmount.toFixed(0)} € en échange de ${newSharePercentage}% de nouvelles parts.`
              : `${company.name} a reçu ${amount.toFixed(0)} € (${newAmountRaised.toFixed(0)} € / ${targetAmount.toFixed(0)} €) sur sa levée de fonds en cours.`,
            cycle: currentCycle.number,
          },
        });

        const updatedShares = await tx.companyShare.findMany({ where: { companyId: raise.companyId } });
        const newPrimaryOwnerId = await this.resolveUltimateControllerId(updatedShares);
        if (newPrimaryOwnerId !== previousPrimaryOwnerId && newPrimaryOwnerId === playerId) {
          await tx.playerNotification.create({
            data: {
              playerId: previousPrimaryOwnerId,
              type: "capital-raise-control-lost",
              message: `La dilution suite à la levée de fonds de ${company.name} t'a fait perdre le contrôle de l'entreprise.`,
              cycle: currentCycle.number,
            },
          });
        }
      }
    });

    if (isFullyFunded) {
      const investor = await this.prisma.client.player.findUnique({ where: { id: playerId }, select: { pseudo: true } });
      await this.discordNotifier.postMessage(
        `🚀 **${company.name}** a complété sa levée de fonds de ${targetAmount.toFixed(0)} € — dernière contribution de ${investor?.pseudo ?? "un investisseur"} !`,
      );
    }

    return { contributed: amount, fullyFunded: isFullyFunded };
  }

  /**
   * Partenariat d'investissement / AG à vote proportionnel (cf.
   * domain/governance.ts) — n'importe quel actionnaire (pas seulement
   * l'actionnaire principal) peut proposer ; le vote est pondéré par les
   * parts détenues, pas une voix par joueur. Une proposition APPROUVÉE
   * s'applique automatiquement, même sans l'accord de l'actionnaire
   * principal — c'est tout l'intérêt d'une décision collective.
   */
  async createProposal(playerId: string, companyId: string, input: CreateProposalInput) {
    await this.assertHasShare(playerId, companyId);
    const company = await this.prisma.client.company.findUnique({ where: { id: companyId } });
    if (!company || company.status !== "ACTIVE") {
      throw new NotFoundException("Entreprise introuvable");
    }
    const existing = await this.prisma.client.companyProposal.findFirst({ where: { companyId, status: "OPEN" } });
    if (existing) {
      throw new BadRequestException("Une proposition est déjà en cours de vote pour cette entreprise");
    }

    const currentCycle = await this.cyclesService.getOrCreateOpenCycle();
    return this.prisma.client.companyProposal.create({
      data: {
        companyId,
        proposerId: playerId,
        type: input.type,
        payload:
          input.type === "SET_DISTRIBUTION_POLICY"
            ? { distributionPolicy: input.distributionPolicy }
            : { axis: input.axis, amount: input.amount },
        createdCycle: currentCycle.number,
        expiresCycle: currentCycle.number + PROPOSAL_VOTING_DURATION_CYCLES,
      },
    });
  }

  /** Tableau de bord partagé entre actionnaires — réservé à ceux qui possèdent des parts. */
  async listProposals(playerId: string, companyId: string) {
    await this.assertHasShare(playerId, companyId);
    const currentCycle = await this.cyclesService.getOrCreateOpenCycle();

    const expired = await this.prisma.client.companyProposal.findMany({
      where: { companyId, status: "OPEN", expiresCycle: { lt: currentCycle.number } },
    });
    for (const proposal of expired) {
      await this.resolveProposal(proposal.id, "REJECTED", currentCycle.number);
    }

    const proposals = await this.prisma.client.companyProposal.findMany({
      where: { companyId },
      include: { votes: true },
      orderBy: { createdCycle: "desc" },
      take: 20,
    });

    const proposers = await this.prisma.client.player.findMany({
      where: { id: { in: [...new Set(proposals.map((p) => p.proposerId))] } },
      select: { id: true, pseudo: true },
    });
    const pseudoById = new Map(proposers.map((p) => [p.id, p.pseudo]));

    return proposals.map((proposal) => {
      const forWeight = proposal.votes.filter((v) => v.inFavor).reduce((sum, v) => sum + v.sharePercentage.toNumber(), 0);
      const againstWeight = proposal.votes
        .filter((v) => !v.inFavor)
        .reduce((sum, v) => sum + v.sharePercentage.toNumber(), 0);
      const myVote = proposal.votes.find((v) => v.voterId === playerId);

      return {
        id: proposal.id,
        proposerPseudo: pseudoById.get(proposal.proposerId) ?? "?",
        type: proposal.type,
        payload: proposal.payload,
        status: proposal.status,
        forWeight,
        againstWeight,
        myVote: myVote ? myVote.inFavor : null,
        createdCycle: proposal.createdCycle,
        expiresCycle: proposal.expiresCycle,
      };
    });
  }

  async castVote(playerId: string, proposalId: string, input: CastVoteInput) {
    const proposal = await this.prisma.client.companyProposal.findUnique({ where: { id: proposalId } });
    if (!proposal || proposal.status !== "OPEN") {
      throw new NotFoundException("Cette proposition n'est plus ouverte au vote");
    }
    await this.assertHasShare(playerId, proposal.companyId);

    const currentCycle = await this.cyclesService.getOrCreateOpenCycle();
    if (proposal.expiresCycle < currentCycle.number) {
      await this.resolveProposal(proposal.id, "REJECTED", currentCycle.number);
      throw new BadRequestException("Le vote pour cette proposition est terminé");
    }

    const share = await this.prisma.client.companyShare.findUniqueOrThrow({
      where: { companyId_playerId: { companyId: proposal.companyId, playerId } },
    });

    await this.prisma.client.companyProposalVote.upsert({
      where: { proposalId_voterId: { proposalId, voterId: playerId } },
      create: {
        proposalId,
        voterId: playerId,
        inFavor: input.inFavor,
        sharePercentage: share.sharePercentage,
        createdCycle: currentCycle.number,
      },
      update: { inFavor: input.inFavor, sharePercentage: share.sharePercentage, createdCycle: currentCycle.number },
    });

    const votes = await this.prisma.client.companyProposalVote.findMany({ where: { proposalId } });
    const forWeight = votes.filter((v) => v.inFavor).reduce((sum, v) => sum + v.sharePercentage.toNumber(), 0);
    const againstWeight = votes.filter((v) => !v.inFavor).reduce((sum, v) => sum + v.sharePercentage.toNumber(), 0);

    if (forWeight > PROPOSAL_MAJORITY_THRESHOLD) {
      await this.resolveProposal(proposalId, "APPROVED", currentCycle.number);
    } else if (againstWeight > PROPOSAL_MAJORITY_THRESHOLD) {
      await this.resolveProposal(proposalId, "REJECTED", currentCycle.number);
    }

    return { voted: true };
  }

  private async resolveProposal(proposalId: string, status: "APPROVED" | "REJECTED", currentCycleNumber: number) {
    const claimed = await this.prisma.client.companyProposal.updateMany({
      where: { id: proposalId, status: "OPEN" },
      data: { status },
    });
    if (claimed.count === 0) return;

    const proposal = await this.prisma.client.companyProposal.findUniqueOrThrow({ where: { id: proposalId } });
    const company = await this.prisma.client.company.findUniqueOrThrow({ where: { id: proposal.companyId } });
    const shares = await this.prisma.client.companyShare.findMany({ where: { companyId: proposal.companyId } });

    let executionNote = "";
    if (status === "APPROVED") {
      if (proposal.type === "SET_DISTRIBUTION_POLICY") {
        const { distributionPolicy } = proposal.payload as { distributionPolicy: "dividend" | "reserve" };
        await this.prisma.client.company.update({ where: { id: proposal.companyId }, data: { distributionPolicy } });
        executionNote = `politique de distribution changée en "${distributionPolicy === "dividend" ? "dividendes" : "réserve"}"`;
      } else {
        const { axis, amount } = proposal.payload as { axis: InvestmentAxis; amount: number };
        const field = INVESTMENT_FIELD_BY_AXIS[axis];
        if (company.cashReserve.toNumber() >= amount) {
          await this.prisma.client.company.update({
            where: { id: proposal.companyId },
            data: { [field]: { increment: amount }, cashReserve: { decrement: amount } },
          });
          executionNote = `${amount.toFixed(0)} € investis dans ${INVESTMENT_AXIS_LABELS[axis]}`;
        } else {
          executionNote = "non appliquée faute de trésorerie suffisante";
        }
      }
    }

    const message =
      status === "APPROVED"
        ? `Proposition approuvée pour ${company.name} : ${executionNote}.`
        : `Proposition rejetée pour ${company.name}.`;

    for (const share of shares) {
      if (!share.playerId) continue;
      await this.prisma.client.playerNotification.create({
        data: {
          playerId: share.playerId,
          type: status === "APPROVED" ? "proposal-approved" : "proposal-rejected",
          message,
          cycle: currentCycleNumber,
        },
      });
    }
  }

  // --- Internes ----------------------------------------------------------

  private async enforceCooldown(
    tx: Pick<PrismaService["client"], "companyActionCooldown">,
    companyId: string,
    actionType: string,
    currentCycleNumber: number,
  ) {
    const cooldown = await tx.companyActionCooldown.findUnique({
      where: { companyId_actionType: { companyId, actionType } },
    });
    if (cooldown && currentCycleNumber - cooldown.lastCycle < ACTION_COOLDOWN_CYCLES) {
      throw new BadRequestException(COOLDOWN_MESSAGE);
    }
    await tx.companyActionCooldown.upsert({
      where: { companyId_actionType: { companyId, actionType } },
      create: { companyId, actionType, lastCycle: currentCycleNumber },
      update: { lastCycle: currentCycleNumber },
    });
  }

  /** Accès en lecture / vente de ses propres parts : n'importe quel actionnaire. */
  private async assertHasShare(playerId: string, companyId: string) {
    const share = await this.prisma.client.companyShare.findUnique({
      where: { companyId_playerId: { companyId, playerId } },
    });
    if (!share || share.sharePercentage.toNumber() <= 0) {
      throw new ForbiddenException("Tu ne possèdes pas de parts dans cette entreprise");
    }
  }

  /**
   * Actions opérationnelles (manager, employés, investissement) réservées à
   * l'actionnaire principal — un actionnaire minoritaire ne pilote pas
   * l'entreprise, il y investit seulement.
   */
  private async assertPrimaryOwner(playerId: string, companyId: string) {
    const shares = await this.prisma.client.companyShare.findMany({ where: { companyId } });
    if ((await this.resolveUltimateControllerId(shares)) !== playerId) {
      throw new ForbiddenException("Seul l'actionnaire principal peut piloter cette entreprise");
    }
  }

  /**
   * Remonte les chaînes de holding (cf. CompanyShare.holderCompany) pour
   * trouver le JOUEUR qui contrôle en dernier ressort une entreprise —
   * contrairement à getPrimaryOwnerId (l'actionnaire DIRECT le plus
   * important, qui peut lui-même être une société), c'est cette résolution
   * qui doit piloter les actions (embaucher, investir, changer la politique
   * de distribution...) pour qu'une filiale détenue à 100% par une holding
   * reste gérable par le joueur qui contrôle cette holding. Profondeur
   * plafonnée pour ne jamais boucler, même si une chaîne circulaire
   * échappait à la garde de création (cf. assertNoCircularHolding).
   */
  private async resolveUltimateControllerId(shares: ShareLike[], depth = 0): Promise<string | undefined> {
    if (depth > 6 || shares.length === 0) return undefined;
    const top = shares.reduce((max, share) => (share.sharePercentage.toNumber() > max.sharePercentage.toNumber() ? share : max));
    if (top.playerId) return top.playerId;
    if (!top.holderCompanyId) return undefined;
    const holderShares = await this.prisma.client.companyShare.findMany({ where: { companyId: top.holderCompanyId } });
    return this.resolveUltimateControllerId(holderShares, depth + 1);
  }

  /**
   * Entreprises ACTIVES dont ce joueur est le contrôleur ultime — directement
   * OU via une chaîne de holding (cf. resolveUltimateControllerId). Sert au
   * seuil de fondation d'une entreprise supplémentaire (computeFoundingCost,
   * hasMatureCompany) : sans ça, un joueur pourrait loger une entreprise dans
   * une holding qu'il contrôle pour faire artificiellement baisser son
   * compteur et re-payer le tarif de départ à chaque fois.
   */
  private async getUltimatelyControlledActiveCompanies(
    playerId: string,
  ): Promise<{ id: string; sectorId: string; foundedCycle: number; cumulativeNetProfit: number }[]> {
    const companies = await this.prisma.client.company.findMany({
      where: { status: "ACTIVE" },
      include: { shares: true },
    });
    const controlled: { id: string; sectorId: string; foundedCycle: number; cumulativeNetProfit: number }[] = [];
    for (const company of companies) {
      if ((await this.resolveUltimateControllerId(company.shares)) === playerId) {
        controlled.push({
          id: company.id,
          sectorId: company.sectorId,
          foundedCycle: company.foundedCycle,
          cumulativeNetProfit: company.cumulativeNetProfit.toNumber(),
        });
      }
    }
    return controlled;
  }

  /** Le joueur contrôle-t-il (directement ou via une chaîne de holding) cette entreprise ? */
  private async controlsCompany(playerId: string, companyId: string): Promise<boolean> {
    const shares = await this.prisma.client.companyShare.findMany({ where: { companyId } });
    return (await this.resolveUltimateControllerId(shares)) === playerId;
  }

  /** Vérifie que le joueur contrôle bien l'entreprise pour le compte de laquelle il agit. */
  private async assertControlsCompany(playerId: string, companyId: string) {
    if (!(await this.controlsCompany(playerId, companyId))) {
      throw new ForbiddenException("Tu ne contrôles pas cette entreprise");
    }
  }

  /**
   * Empêche une participation circulaire (A détient B qui détient A) lors
   * de la création d'une part détenue par une société — remonte la chaîne
   * de contrôle de l'ACQUÉREUSE et rejette si la CIBLE y apparaît déjà.
   */
  private async assertNoCircularHolding(acquirerCompanyId: string, targetCompanyId: string, depth = 0) {
    if (depth > 6) return;
    if (acquirerCompanyId === targetCompanyId) {
      throw new BadRequestException("Participation circulaire interdite");
    }
    const acquirerShares = await this.prisma.client.companyShare.findMany({ where: { companyId: acquirerCompanyId } });
    for (const share of acquirerShares) {
      if (share.holderCompanyId === targetCompanyId) {
        throw new BadRequestException("Participation circulaire interdite");
      }
      if (share.holderCompanyId) {
        await this.assertNoCircularHolding(share.holderCompanyId, targetCompanyId, depth + 1);
      }
    }
  }

  private async assertProductBelongsToCompany(productId: string, companyId: string) {
    const product = await this.prisma.client.companyProduct.findUnique({ where: { id: productId } });
    if (!product || product.companyId !== companyId) {
      throw new NotFoundException("Gamme de produit introuvable pour cette entreprise");
    }
    return product;
  }

  private async refreshCompanyView(playerId: string, companyId: string) {
    const [company, share, currentCycle] = await Promise.all([
      this.prisma.client.company.findUniqueOrThrow({ where: { id: companyId }, include: COMPANY_VIEW_INCLUDE }),
      this.prisma.client.companyShare.findUnique({ where: { companyId_playerId: { companyId, playerId } } }),
      this.cyclesService.getOrCreateOpenCycle(),
    ]);
    return this.toCompanyView(company, share?.sharePercentage.toNumber() ?? 0, currentCycle.number);
  }

  private getPrimaryOwnerId(shares: ShareLike[]): string | undefined {
    if (shares.length === 0) return undefined;
    return (
      shares.reduce((max, share) => (share.sharePercentage.toNumber() > max.sharePercentage.toNumber() ? share : max)).playerId ??
      undefined
    );
  }

  private hasMatureCompany(companies: OwnedCompanySummary[], currentCycleNumber: number): boolean {
    return companies.some(
      (company) =>
        currentCycleNumber - company.foundedCycle >= EXPANSION_MIN_CYCLES_ACTIVE &&
        company.cumulativeNetProfit >= EXPANSION_MIN_CUMULATIVE_NET_PROFIT,
    );
  }

  /**
   * Bilan simplifié : actif (trésorerie + valeur comptable de l'équipement
   * + coût cumulé des autres leviers, traités comme des actifs incorporels
   * + stock valorisé au coût) moins dette (prêts actifs) = capitaux propres
   * — le solde, pas une valeur suivie indépendamment (cf.
   * packages/game-engine/src/finance.ts, computeCompanyBalanceSheet).
   */
  private computeBalanceSheetForCompany(company: Parameters<typeof assembleCompanyBalanceSheet>[0]) {
    return assembleCompanyBalanceSheet(company);
  }

  /**
   * Attractivité effective (cf. game-engine/cycles.ts closeCurrentCycle,
   * même formule) — recalculée en direct plutôt que lue depuis le champ
   * persisté : contrairement au score de base (figé à la fondation, ne
   * bouge que sur défaut de prêt), le bonus d'infrastructure communale
   * suit le fonds en temps réel pour que les contributions des joueurs se
   * reflètent immédiatement partout où l'attractivité est affichée (fiche
   * entreprise, tableau de bord, marché des parts, capital-risque) — pas
   * seulement dans le calcul de vente interne au prochain cycle.
   */
  private computeAttractivenessBreakdown(company: {
    attractivenessScore: { toNumber(): number };
    hasManager: boolean;
    municipality: { name: string; infrastructureFund: { toNumber(): number } };
    sector: { name: string };
  }) {
    const base = company.attractivenessScore.toNumber();
    const managerBonus = computeEffectiveAttractiveness(base, company.hasManager) - base;
    const infrastructureBonus = computeInfrastructureAttractivenessBonus(company.municipality.infrastructureFund.toNumber());
    const provinceAffinityBonus = PROVINCE_SECTOR_AFFINITIES[company.municipality.name]?.includes(company.sector.name)
      ? PROVINCE_SECTOR_AFFINITY_BONUS
      : 0;

    return {
      base,
      managerBonus,
      infrastructureBonus,
      provinceAffinityBonus,
      effective: base + managerBonus + infrastructureBonus + provinceAffinityBonus,
    };
  }

  /**
   * Niveau d'innovation effectif = niveau financé par l'investissement en
   * argent + bonus de l'équipe R&D (cf. game-engine/companies.ts,
   * computeRdStaffInnovationBonus — même formule que la simulation de
   * cycle) : recalculé en direct pour que le déblocage de gamme (isUnlocked,
   * launchProduct) et l'affichage restent cohérents avec ce que le prochain
   * cycle appliquera réellement.
   */
  private computeEffectiveInnovationLevel(
    innovationInvestment: number,
    departments: { department: string; morale: { toNumber(): number }; experienceCycles: number }[],
    employeeCounts: { department: string; tier: string; count: number }[],
  ): number {
    const rdCounts = { unskilled: 0, qualified: 0, specialist: 0 };
    for (const row of employeeCounts) {
      if (row.department === "rd") {
        rdCounts[row.tier as keyof typeof rdCounts] = row.count;
      }
    }
    const rdDeptRow = departments.find((d) => d.department === "rd");
    const rdMorale = rdDeptRow?.morale.toNumber() ?? 50;
    const rdContribution = computeDepartmentContribution(rdCounts, rdMorale, rdDeptRow?.experienceCycles ?? 0);
    const baseLevel = computeEffectiveInvestmentLevel(innovationInvestment);
    // Pas de plafond à 100 : baseLevel intègre déjà le palier mondial
    // au-delà de 100 (cf. computeEffectiveInvestmentLevel), cohérent avec
    // game-engine/cycles.ts.
    return baseLevel + computeRdStaffInnovationBonus(rdContribution);
  }

  private toCompanyView(
    company: {
      id: string;
      name: string;
      attractivenessScore: { toNumber(): number };
      status: string;
      createdAt: Date;
      foundedCycle: number;
      hasManager: boolean;
      departments: { department: string; hasManager: boolean; morale: { toNumber(): number }; experienceCycles: number }[];
      employeeCounts: { department: string; tier: string; count: number }[];
      cumulativeNetProfit: { toNumber(): number };
      marketingInvestment: { toNumber(): number };
      rdInvestment: { toNumber(): number };
      equipmentInvestment: { toNumber(): number };
      workConditionsInvestment: { toNumber(): number };
      cashReserve: { toNumber(): number };
      distributionPolicy: string;
      autoReinvestAxis: string | null;
      autoReinvestCapPerCycle: { toNumber(): number } | null;
      depositRate: { toNumber(): number };
      deposits?: { balance: { toNumber(): number } }[];
      liquidationReserve: { toNumber(): number };
      liquidationReserveSinceCycle: number | null;
      automationInvestment: { toNumber(): number };
      brandingInvestment: { toNumber(): number };
      innovationInvestment: { toNumber(): number };
      trainingInvestment: { toNumber(): number };
      safetyInvestment: { toNumber(): number };
      insuranceInvestment: { toNumber(): number };
      capacityExpansionInvestment: { toNumber(): number };
      massMarketingBoostMagnitude: { toNumber(): number };
      massMarketingBoostExpiresCycle: number | null;
      sector: { name: string };
      municipality: { name: string; infrastructureFund: { toNumber(): number } };
      cycleReports: {
        revenue: { toNumber(): number };
        costs: { toNumber(): number };
        profit: { toNumber(): number };
        taxPaid: { toNumber(): number };
        eventLabel: string | null;
        unitsProduced: { toNumber(): number };
        unitsSold: { toNumber(): number };
        unitsLost: { toNumber(): number };
        stockUnits: { toNumber(): number };
      }[];
      products: {
        id: string;
        type: string;
        unitPrice: { toNumber(): number };
        capacityAllocation: { toNumber(): number };
        stockUnits: { toNumber(): number };
        launchedCycle: number;
        cycleReports: {
          unitsProduced: { toNumber(): number };
          unitsSold: { toNumber(): number };
          unitsLost: { toNumber(): number };
          unitCost: { toNumber(): number };
          revenue: { toNumber(): number };
          marketSharePercent: { toNumber(): number };
        }[];
      }[];
    },
    sharePercentage: number,
    currentCycleNumber: number,
  ) {
    const latestReport = company.cycleReports[0];
    const nonCoreAllocationSum = company.products
      .filter((p) => p.type !== "core")
      .reduce((sum, p) => sum + p.capacityAllocation.toNumber(), 0);

    const departmentsView = DEPARTMENTS.map((department) => {
      const deptRow = company.departments.find((d) => d.department === department);
      const employeeCounts = { unskilled: 0, qualified: 0, specialist: 0 };
      for (const row of company.employeeCounts) {
        if (row.department === department) {
          employeeCounts[row.tier as keyof typeof employeeCounts] = row.count;
        }
      }
      const experienceCycles = deptRow?.experienceCycles ?? 0;
      return {
        department,
        label: DEPARTMENT_CATALOG[department].label,
        hasManager: deptRow?.hasManager ?? false,
        morale: deptRow?.morale.toNumber() ?? 50,
        employeeCounts,
        totalEmployeeCount: employeeCounts.unskilled + employeeCounts.qualified + employeeCounts.specialist,
        experienceCycles,
        experienceBonus: computeDepartmentExperienceBonus(experienceCycles),
      };
    });
    const totalEmployeeCount = departmentsView.reduce((sum, d) => sum + d.totalEmployeeCount, 0);

    const attractiveness = this.computeAttractivenessBreakdown(company);

    return {
      id: company.id,
      name: company.name,
      sector: company.sector.name,
      municipality: company.municipality.name,
      attractivenessScore: attractiveness.base,
      effectiveAttractiveness: attractiveness.effective,
      attractivenessBreakdown: {
        base: attractiveness.base,
        managerBonus: attractiveness.managerBonus,
        infrastructureBonus: attractiveness.infrastructureBonus,
        provinceAffinityBonus: attractiveness.provinceAffinityBonus,
      },
      status: company.status,
      createdAt: company.createdAt,
      hasManager: company.hasManager,
      departments: departmentsView,
      totalEmployeeCount,
      foundedCycle: company.foundedCycle,
      cyclesActive: currentCycleNumber - company.foundedCycle,
      cumulativeNetProfit: company.cumulativeNetProfit.toNumber(),
      // Valorisation par rentabilité soutenue (cf. domain/valorization.ts) —
      // ce qui compte pour TON patrimoine net et le classement, jamais pour
      // le bilan comptable ci-dessous (capacité d'emprunt, prix plancher
      // d'OPA restent en valeur comptable pure).
      valorizationMultiplier: computeValorizationMultiplier(
        company.cumulativeNetProfit.toNumber(),
        Math.max(1, currentCycleNumber - company.foundedCycle),
      ),
      sharePercentage,
      levels: {
        marketing: computeEffectiveInvestmentLevel(company.marketingInvestment.toNumber()),
        quality: computeEffectiveInvestmentLevel(company.rdInvestment.toNumber()),
        equipment: computeEffectiveInvestmentLevel(company.equipmentInvestment.toNumber()),
        workConditions: computeEffectiveInvestmentLevel(company.workConditionsInvestment.toNumber()),
        automation: computeEffectiveInvestmentLevel(company.automationInvestment.toNumber()),
        branding: computeEffectiveInvestmentLevel(company.brandingInvestment.toNumber()),
        innovation: this.computeEffectiveInnovationLevel(
          company.innovationInvestment.toNumber(),
          company.departments,
          company.employeeCounts,
        ),
        training: computeEffectiveInvestmentLevel(company.trainingInvestment.toNumber()),
        safety: computeEffectiveInvestmentLevel(company.safetyInvestment.toNumber()),
        insurance: computeEffectiveInvestmentLevel(company.insuranceInvestment.toNumber()),
      },
      // Expansion de capacité & campagne marketing de masse (cf.
      // domain/company.ts) — les deux puits de dépense SANS plafond ni
      // cooldown, contrairement aux leviers ci-dessus.
      capacityExpansionInvestment: company.capacityExpansionInvestment.toNumber(),
      capacityExpansionMultiplier: computeCapacityExpansionMultiplier(company.capacityExpansionInvestment.toNumber()),
      massMarketingCampaign:
        company.massMarketingBoostExpiresCycle !== null && company.massMarketingBoostExpiresCycle >= currentCycleNumber
          ? {
              magnitude: company.massMarketingBoostMagnitude.toNumber(),
              cyclesRemaining: company.massMarketingBoostExpiresCycle - currentCycleNumber,
            }
          : null,
      cashReserve: company.cashReserve.toNumber(),
      distributionPolicy: company.distributionPolicy,
      autoReinvestAxis: company.autoReinvestAxis,
      autoReinvestCapPerCycle: company.autoReinvestCapPerCycle?.toNumber() ?? null,
      depositRate: company.depositRate.toNumber(),
      totalDeposits: (company.deposits ?? []).reduce((sum, d) => sum + d.balance.toNumber(), 0),
      liquidationReserve: company.liquidationReserve.toNumber(),
      liquidationReserveSinceCycle: company.liquidationReserveSinceCycle,
      liquidationReserveIsMature:
        company.liquidationReserveSinceCycle !== null &&
        isLiquidationReserveMature(company.liquidationReserveSinceCycle, currentCycleNumber),
      liquidationReserveMatureAtCycle:
        company.liquidationReserveSinceCycle !== null
          ? company.liquidationReserveSinceCycle + LIQUIDATION_RESERVE_HOLDING_CYCLES
          : null,
      latestCycleReport: latestReport
        ? {
            revenue: latestReport.revenue.toNumber(),
            costs: latestReport.costs.toNumber(),
            profit: latestReport.profit.toNumber(),
            taxPaid: latestReport.taxPaid.toNumber(),
            netProfit: latestReport.profit.toNumber() - latestReport.taxPaid.toNumber(),
            eventLabel: latestReport.eventLabel,
            unitsProduced: latestReport.unitsProduced.toNumber(),
            unitsSold: latestReport.unitsSold.toNumber(),
            unitsLost: latestReport.unitsLost.toNumber(),
            stockUnits: latestReport.stockUnits.toNumber(),
          }
        : null,
      products: company.products.map((product) => {
        const isCore = product.type === "core";
        const latestProductReport = product.cycleReports[0];
        const productType = product.type as ProductType;
        const catalogEntry = PRODUCT_CATALOG[productType];

        // Transparence sur le mécanisme de prix (cf. game-engine/companies.ts
        // computeCompetitiveness) : le marché n'accepte pas n'importe quel
        // prix sans broncher — au-delà de ce prix de référence propre à la
        // gamme, chaque euro de plus rogne le multiplicateur de demande
        // (élasticité), jusqu'à un plancher jamais nul mais négligeable ; en
        // dessous, la demande peut au mieux tripler (DEMAND_PRICE_MULTIPLIER_CAP).
        const qualityLevel = computeEffectiveInvestmentLevel(company.rdInvestment.toNumber());
        const brandingLevel = computeEffectiveInvestmentLevel(company.brandingInvestment.toNumber());
        const acceptedReferencePrice =
          REFERENCE_UNIT_PRICE * catalogEntry.referencePriceMultiplier * computeQualityPriceTolerance(qualityLevel);
        const priceElasticity = PRICE_ELASTICITY_BASE * (1 - (brandingLevel / 100) * BRANDING_MAX_ELASTICITY_REDUCTION);
        const currentPriceMultiplier = Math.min(
          DEMAND_PRICE_MULTIPLIER_CAP,
          Math.pow(acceptedReferencePrice / Math.max(0.01, product.unitPrice.toNumber()), priceElasticity),
        );

        return {
          id: product.id,
          type: product.type,
          label: PRODUCT_CATALOG[productType]?.label ?? product.type,
          isCore,
          unitPrice: product.unitPrice.toNumber(),
          capacityAllocation: isCore ? Math.max(0, 100 - nonCoreAllocationSum) : product.capacityAllocation.toNumber(),
          stockUnits: product.stockUnits.toNumber(),
          launchedCycle: product.launchedCycle,
          pricing: {
            acceptedReferencePrice,
            priceElasticity,
            priceMultiplierCap: DEMAND_PRICE_MULTIPLIER_CAP,
            currentPriceMultiplier,
          },
          latestCycleReport: latestProductReport
            ? {
                unitsProduced: latestProductReport.unitsProduced.toNumber(),
                unitsSold: latestProductReport.unitsSold.toNumber(),
                unitsLost: latestProductReport.unitsLost.toNumber(),
                unitCost: latestProductReport.unitCost.toNumber(),
                revenue: latestProductReport.revenue.toNumber(),
                marketSharePercent: latestProductReport.marketSharePercent.toNumber(),
              }
            : null,
        };
      }),
    };
  }
}
