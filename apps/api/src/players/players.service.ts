import { Injectable, NotFoundException } from "@nestjs/common";
import { assembleCompanyBalanceSheet, computePersonalGoodValue, computeSpotPrice } from "@patrimoine-jeu/game-engine";
import { PERSONAL_GOOD_CATALOG, type PersonalGoodId } from "@patrimoine-jeu/domain";
import { EmploymentService } from "../employment/employment.service.js";
import { CyclesService } from "../cycles/cycles.service.js";
import { PrismaService } from "../prisma/prisma.service.js";

@Injectable()
export class PlayersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly employmentService: EmploymentService,
    private readonly cyclesService: CyclesService,
  ) {}

  async findMe(playerId: string) {
    const player = await this.prisma.client.player.findUnique({
      where: { id: playerId },
      include: { stats: true },
    });

    if (!player) {
      throw new NotFoundException(`Player ${playerId} not found`);
    }

    const employment = await this.employmentService.getCurrentEmployment(playerId);

    return {
      id: player.id,
      email: player.email,
      pseudo: player.pseudo,
      createdAt: player.createdAt,
      stats: player.stats
        ? {
            wealthLiquid: player.stats.wealthLiquid.toNumber(),
            wealthDisplayed: player.stats.wealthDisplayed.toNumber(),
            reputation: player.stats.reputation.toNumber(),
            experience: player.stats.experience.toNumber(),
            wellbeing: player.stats.wellbeing.toNumber(),
          }
        : null,
      employment,
    };
  }

  /**
   * Répartition du patrimoine net en direct — recalculée à la demande à
   * partir de l'état actuel (contrairement à PlayerStats.netWorth, un
   * instantané figé à la dernière clôture de cycle). Reprend exactement les
   * mêmes formules que packages/game-engine/cycles.ts (équité immobilière,
   * quote-part dans les entreprises détenues, matières premières au cours
   * actuel, épargne, biens personnels dépréciés) pour que le total recoupe
   * ce que la clôture de cycle calculera au prochain passage.
   */
  async getWealthBreakdown(playerId: string) {
    const [stats, currentCycle, properties, mortgageLoans, shares, commodityHoldings, commodityMarkets, savingsAccounts, personalGoods] =
      await Promise.all([
        this.prisma.client.playerStats.findUnique({ where: { playerId } }),
        this.cyclesService.getOrCreateOpenCycle(),
        this.prisma.client.property.findMany({ where: { ownerId: playerId } }),
        this.prisma.client.loan.findMany({
          where: { borrowerPlayerId: playerId, status: "ACTIVE", collateralPropertyId: { not: null } },
        }),
        this.prisma.client.companyShare.findMany({
          where: { playerId, sharePercentage: { gt: 0 } },
          include: { company: { include: { loans: true, products: true, loansAsLender: true, deposits: { where: { withdrawnCycle: null } } } } },
        }),
        this.prisma.client.playerCommodityHolding.findMany({ where: { playerId } }),
        this.prisma.client.commodityMarket.findMany(),
        this.prisma.client.savingsAccount.findMany({ where: { playerId, withdrawnCycle: null } }),
        this.prisma.client.personalGood.findMany({ where: { playerId, soldCycle: null } }),
      ]);

    const wealthLiquid = stats?.wealthLiquid.toNumber() ?? 0;

    const mortgageBalanceByPropertyId = new Map<string, number>();
    for (const loan of mortgageLoans) {
      if (loan.collateralPropertyId) {
        mortgageBalanceByPropertyId.set(loan.collateralPropertyId, loan.remainingBalance.toNumber());
      }
    }
    const propertyEquity = properties.reduce(
      (sum, property) => sum + (property.marketValue.toNumber() - (mortgageBalanceByPropertyId.get(property.id) ?? 0)),
      0,
    );

    const companyEquity = shares.reduce((sum, share) => {
      const { equity } = assembleCompanyBalanceSheet(share.company);
      return sum + equity * (share.sharePercentage.toNumber() / 100);
    }, 0);

    const commodityPriceBySector = new Map(
      commodityMarkets.map((market) => [market.sectorId, computeSpotPrice(market.commodityReserve.toNumber(), market.cashReserve.toNumber())]),
    );
    const commodityValue = commodityHoldings.reduce(
      (sum, holding) => sum + holding.quantity.toNumber() * (commodityPriceBySector.get(holding.sectorId) ?? 0),
      0,
    );

    const savingsValue = savingsAccounts.reduce((sum, account) => sum + account.balance.toNumber(), 0);

    const personalGoodsValue = personalGoods.reduce((sum, good) => {
      const definition = PERSONAL_GOOD_CATALOG[good.goodId as PersonalGoodId];
      if (!definition) return sum;
      return (
        sum +
        computePersonalGoodValue(good.purchasePrice.toNumber(), definition.depreciationRatePerCycle, currentCycle.number - good.purchasedCycle)
      );
    }, 0);

    const total = wealthLiquid + propertyEquity + companyEquity + commodityValue + savingsValue + personalGoodsValue;

    return { wealthLiquid, propertyEquity, companyEquity, commodityValue, savingsValue, personalGoodsValue, total };
  }
}
