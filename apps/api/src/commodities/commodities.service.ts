import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { BuyCommodityInput, SellCommodityInput } from "@patrimoine-jeu/domain";
import { computeAmmSwapOutput, computeMaxTradeOutput, computeSpotPrice } from "@patrimoine-jeu/game-engine";
import { PrismaService } from "../prisma/prisma.service.js";

const RECENT_PRICE_HISTORY_TAKE = 2;

@Injectable()
export class CommoditiesService {
  constructor(private readonly prisma: PrismaService) {}

  async listMarkets(playerId: string) {
    const [markets, holdings] = await Promise.all([
      this.prisma.client.commodityMarket.findMany({
        include: {
          sector: true,
          priceHistory: { orderBy: { cycle: { number: "desc" } }, take: RECENT_PRICE_HISTORY_TAKE },
        },
        orderBy: { sector: { name: "asc" } },
      }),
      this.prisma.client.playerCommodityHolding.findMany({ where: { playerId } }),
    ]);

    const holdingBySector = new Map(holdings.map((h) => [h.sectorId, h.quantity.toNumber()]));

    return markets.map((market) => {
      const price = computeSpotPrice(market.commodityReserve.toNumber(), market.cashReserve.toNumber());
      const previousPrice = market.priceHistory[1]?.price.toNumber() ?? null;
      return {
        sectorId: market.sectorId,
        sector: market.sector.name,
        price,
        previousPrice,
        commodityReserve: market.commodityReserve.toNumber(),
        cashReserve: market.cashReserve.toNumber(),
        myHolding: holdingBySector.get(market.sectorId) ?? 0,
      };
    });
  }

  async buy(playerId: string, sectorId: string, input: BuyCommodityInput) {
    const [market, stats] = await Promise.all([
      this.prisma.client.commodityMarket.findUnique({ where: { sectorId }, include: { sector: true } }),
      this.prisma.client.playerStats.findUnique({ where: { playerId } }),
    ]);
    if (!market) {
      throw new NotFoundException("Marché introuvable pour ce secteur");
    }
    if (!stats || stats.wealthLiquid.toNumber() < input.cashAmount) {
      throw new BadRequestException("Fonds insuffisants pour cet achat");
    }

    const commodityReserve = market.commodityReserve.toNumber();
    const cashReserve = market.cashReserve.toNumber();
    const unitsOut = computeAmmSwapOutput(cashReserve, commodityReserve, input.cashAmount);
    const maxUnits = computeMaxTradeOutput(commodityReserve);
    if (unitsOut > maxUnits) {
      throw new BadRequestException(
        `Ce marché est encore trop peu profond pour un achat de cette taille — maximum ${maxUnits.toFixed(2)} unités en une seule transaction`,
      );
    }

    await this.prisma.client.$transaction(async (tx) => {
      await tx.playerStats.update({ where: { playerId }, data: { wealthLiquid: { decrement: input.cashAmount } } });
      await tx.commodityMarket.update({
        where: { sectorId },
        data: { cashReserve: { increment: input.cashAmount }, commodityReserve: { decrement: unitsOut } },
      });
      await tx.playerCommodityHolding.upsert({
        where: { playerId_sectorId: { playerId, sectorId } },
        create: { playerId, sectorId, quantity: unitsOut },
        update: { quantity: { increment: unitsOut } },
      });
    });

    return { unitsReceived: unitsOut, cashSpent: input.cashAmount };
  }

  async sell(playerId: string, sectorId: string, input: SellCommodityInput) {
    const [market, holding] = await Promise.all([
      this.prisma.client.commodityMarket.findUnique({ where: { sectorId } }),
      this.prisma.client.playerCommodityHolding.findUnique({ where: { playerId_sectorId: { playerId, sectorId } } }),
    ]);
    if (!market) {
      throw new NotFoundException("Marché introuvable pour ce secteur");
    }
    if (!holding || holding.quantity.toNumber() < input.units) {
      throw new BadRequestException("Tu ne possèdes pas assez de cette matière première");
    }

    const commodityReserve = market.commodityReserve.toNumber();
    const cashReserve = market.cashReserve.toNumber();
    const cashOut = computeAmmSwapOutput(commodityReserve, cashReserve, input.units);
    const maxCash = computeMaxTradeOutput(cashReserve);
    if (cashOut > maxCash) {
      throw new BadRequestException(
        `Ce marché est encore trop peu profond pour une vente de cette taille — maximum ${maxCash.toFixed(2)} € de trésorerie en une seule transaction`,
      );
    }

    await this.prisma.client.$transaction(async (tx) => {
      await tx.playerCommodityHolding.update({
        where: { playerId_sectorId: { playerId, sectorId } },
        data: { quantity: { decrement: input.units } },
      });
      await tx.commodityMarket.update({
        where: { sectorId },
        data: { commodityReserve: { increment: input.units }, cashReserve: { decrement: cashOut } },
      });
      await tx.playerStats.update({ where: { playerId }, data: { wealthLiquid: { increment: cashOut } } });
    });

    return { unitsSold: input.units, cashReceived: cashOut };
  }
}
