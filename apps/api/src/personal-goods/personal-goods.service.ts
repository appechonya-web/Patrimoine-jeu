import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PERSONAL_GOOD_CATALOG, PERSONAL_GOOD_LIST, type BuyPersonalGoodInput, type PersonalGoodId } from "@patrimoine-jeu/domain";
import { computePersonalGoodValue } from "@patrimoine-jeu/game-engine";
import { CyclesService } from "../cycles/cycles.service.js";
import { PrismaService } from "../prisma/prisma.service.js";

@Injectable()
export class PersonalGoodsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cyclesService: CyclesService,
  ) {}

  async list(playerId: string) {
    const [owned, currentCycle] = await Promise.all([
      this.prisma.client.personalGood.findMany({
        where: { playerId, soldCycle: null },
        orderBy: { purchasedCycle: "asc" },
      }),
      this.cyclesService.getOrCreateOpenCycle(),
    ]);

    return {
      catalog: PERSONAL_GOOD_LIST,
      owned: owned.map((good) => this.toView(good, currentCycle.number)),
    };
  }

  async buy(playerId: string, input: BuyPersonalGoodInput) {
    const definition = PERSONAL_GOOD_CATALOG[input.goodId];
    const [stats, currentCycle] = await Promise.all([
      this.prisma.client.playerStats.findUnique({ where: { playerId } }),
      this.cyclesService.getOrCreateOpenCycle(),
    ]);
    if (!stats || stats.wealthLiquid.toNumber() < definition.price) {
      throw new BadRequestException("Fonds insuffisants pour cet achat");
    }

    const good = await this.prisma.client.$transaction(async (tx) => {
      await tx.playerStats.update({ where: { playerId }, data: { wealthLiquid: { decrement: definition.price } } });
      return tx.personalGood.create({
        data: {
          playerId,
          goodId: input.goodId,
          purchasePrice: definition.price,
          purchasedCycle: currentCycle.number,
        },
      });
    });

    return this.toView(good, currentCycle.number);
  }

  async sell(playerId: string, goodInstanceId: string) {
    const good = await this.prisma.client.personalGood.findUnique({ where: { id: goodInstanceId } });
    if (!good || good.playerId !== playerId || good.soldCycle !== null) {
      throw new NotFoundException("Ce bien n'est plus disponible");
    }

    const currentCycle = await this.cyclesService.getOrCreateOpenCycle();
    const definition = PERSONAL_GOOD_CATALOG[good.goodId as PersonalGoodId];
    const saleValue = computePersonalGoodValue(
      good.purchasePrice.toNumber(),
      definition.depreciationRatePerCycle,
      currentCycle.number - good.purchasedCycle,
    );

    await this.prisma.client.$transaction(async (tx) => {
      const claimed = await tx.personalGood.updateMany({
        where: { id: goodInstanceId, soldCycle: null },
        data: { soldCycle: currentCycle.number },
      });
      if (claimed.count === 0) {
        throw new BadRequestException("Ce bien a déjà été revendu");
      }
      await tx.playerStats.update({ where: { playerId }, data: { wealthLiquid: { increment: saleValue } } });
    });

    return { sold: true, value: saleValue };
  }

  private toView(
    good: { id: string; goodId: string; purchasePrice: { toNumber(): number }; purchasedCycle: number },
    currentCycleNumber: number,
  ) {
    const definition = PERSONAL_GOOD_CATALOG[good.goodId as PersonalGoodId];
    const currentValue = computePersonalGoodValue(
      good.purchasePrice.toNumber(),
      definition.depreciationRatePerCycle,
      currentCycleNumber - good.purchasedCycle,
    );
    return {
      id: good.id,
      goodId: good.goodId,
      label: definition.label,
      category: definition.category,
      purchasePrice: good.purchasePrice.toNumber(),
      purchasedCycle: good.purchasedCycle,
      currentValue,
      wellbeingBonusPerCycle: definition.wellbeingBonusPerCycle,
    };
  }
}
