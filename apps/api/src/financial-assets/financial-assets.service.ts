import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { FINANCIAL_ASSET_CATALOG, type CreateAssetOrderInput } from "@patrimoine-jeu/domain";
import { computeAssetRiskLevel, computeCapitalGainsTax, getCapitalGainsRules } from "@patrimoine-jeu/game-engine";
import { AchievementsService } from "../engagement/achievements.service.js";
import { CyclesService } from "../cycles/cycles.service.js";
import { PrismaService } from "../prisma/prisma.service.js";

@Injectable()
export class FinancialAssetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly achievementsService: AchievementsService,
    private readonly cyclesService: CyclesService,
  ) {}

  async list(playerId: string) {
    const [assets, holdings] = await Promise.all([
      this.prisma.client.financialAsset.findMany({ orderBy: [{ type: "asc" }, { name: "asc" }] }),
      this.prisma.client.playerAssetHolding.findMany({ where: { playerId } }),
    ]);
    const holdingByAssetId = new Map(holdings.map((h) => [h.assetId, h]));

    return assets.map((asset) => this.toView(asset, holdingByAssetId.get(asset.id) ?? null));
  }

  /**
   * Cours de tous les actifs depuis l'introduction de FinancialAssetPriceHistory
   * (pas depuis le tout premier cycle du jeu — les cours antérieurs n'ont
   * jamais été journalisés). Un seul appel groupé plutôt qu'un par actif,
   * pour la page /placements qui affiche un graphique sous chaque actif.
   */
  async priceHistory(): Promise<Record<string, { cycleNumber: number; price: number }[]>> {
    const rows = await this.prisma.client.financialAssetPriceHistory.findMany({
      include: { asset: true, cycle: true },
      orderBy: { cycle: { number: "asc" } },
    });

    const result: Record<string, { cycleNumber: number; price: number }[]> = {};
    for (const row of rows) {
      const key = row.asset.key;
      (result[key] ??= []).push({ cycleNumber: row.cycle.number, price: row.price.toNumber() });
    }
    return result;
  }

  async buy(playerId: string, assetKey: string, amount: number) {
    const [asset, stats] = await Promise.all([
      this.prisma.client.financialAsset.findUnique({ where: { key: assetKey } }),
      this.prisma.client.playerStats.findUnique({ where: { playerId } }),
    ]);
    if (!asset) {
      throw new NotFoundException("Actif introuvable");
    }
    if (!stats || stats.wealthLiquid.toNumber() < amount) {
      throw new BadRequestException("Fonds insuffisants pour cet achat");
    }

    const price = asset.price.toNumber();
    const quantity = amount / price;
    const currentCycle = await this.cyclesService.getOrCreateOpenCycle();

    const holding = await this.prisma.client.$transaction(async (tx) => {
      await tx.playerStats.update({ where: { playerId }, data: { wealthLiquid: { decrement: amount } } });
      const updated = await tx.playerAssetHolding.upsert({
        where: { playerId_assetId: { playerId, assetId: asset.id } },
        create: { playerId, assetId: asset.id, quantity, costBasis: amount },
        update: { quantity: { increment: quantity }, costBasis: { increment: amount } },
      });
      await tx.financialAssetTransaction.create({
        data: { playerId, assetId: asset.id, type: "BUY", quantity, price, amount, cycleId: currentCycle.id },
      });
      return updated;
    });

    await this.achievementsService.tryUnlock(playerId, "first-asset-trade");

    return this.toView(asset, holding);
  }

  async sell(playerId: string, assetKey: string, quantity: number) {
    const asset = await this.prisma.client.financialAsset.findUnique({ where: { key: assetKey } });
    if (!asset) {
      throw new NotFoundException("Actif introuvable");
    }
    const holding = await this.prisma.client.playerAssetHolding.findUnique({
      where: { playerId_assetId: { playerId, assetId: asset.id } },
    });
    const heldQuantity = holding?.quantity.toNumber() ?? 0;
    if (!holding || heldQuantity < quantity - 1e-9) {
      throw new BadRequestException("Tu ne possèdes pas assez de cet actif");
    }

    const price = asset.price.toNumber();
    const totalCostBasis = holding.costBasis.toNumber();
    const costBasisSold = totalCostBasis * (quantity / heldQuantity);
    const saleProceeds = quantity * price;

    const [capitalGains, stats] = await Promise.all([
      getCapitalGainsRules(this.prisma.client),
      this.prisma.client.playerStats.findUnique({ where: { playerId } }),
    ]);
    const exemptionRemaining = capitalGains.exemption - (stats?.cumulativeInvestmentGains.toNumber() ?? 0);
    const { gain, tax, net } = computeCapitalGainsTax(saleProceeds, costBasisSold, exemptionRemaining, capitalGains.rate);

    const remainingQuantity = heldQuantity - quantity;
    const remainingCostBasis = totalCostBasis - costBasisSold;
    const currentCycle = await this.cyclesService.getOrCreateOpenCycle();

    await this.prisma.client.$transaction(async (tx) => {
      await tx.playerStats.update({
        where: { playerId },
        data: {
          wealthLiquid: { increment: net },
          cumulativeInvestmentGains: { increment: gain },
        },
      });
      if (remainingQuantity <= 1e-9) {
        await tx.playerAssetHolding.delete({ where: { playerId_assetId: { playerId, assetId: asset.id } } });
      } else {
        await tx.playerAssetHolding.update({
          where: { playerId_assetId: { playerId, assetId: asset.id } },
          data: { quantity: remainingQuantity, costBasis: remainingCostBasis },
        });
      }
      await tx.financialAssetTransaction.create({
        data: {
          playerId,
          assetId: asset.id,
          type: "SELL",
          quantity,
          price,
          amount: saleProceeds,
          gain,
          tax,
          cycleId: currentCycle.id,
        },
      });
    });

    return { sold: quantity, saleProceeds, gain, tax, net };
  }

  async setDividendPolicy(playerId: string, assetKey: string, policy: "CASH" | "REINVEST") {
    const asset = await this.prisma.client.financialAsset.findUnique({ where: { key: assetKey } });
    if (!asset) {
      throw new NotFoundException("Actif introuvable");
    }
    const holding = await this.prisma.client.playerAssetHolding.findUnique({
      where: { playerId_assetId: { playerId, assetId: asset.id } },
    });
    if (!holding) {
      throw new NotFoundException("Tu ne possèdes pas cet actif");
    }
    const updated = await this.prisma.client.playerAssetHolding.update({
      where: { playerId_assetId: { playerId, assetId: asset.id } },
      data: { dividendPolicy: policy },
    });
    return this.toView(asset, updated);
  }

  /** Relevé personnel des transactions passées (cf. domain/financial-assets.ts) — distinct de l'historique de cours, public. */
  async listTransactions(playerId: string) {
    const transactions = await this.prisma.client.financialAssetTransaction.findMany({
      where: { playerId },
      include: { asset: { select: { key: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return transactions.map((t) => ({
      id: t.id,
      assetKey: t.asset.key,
      assetName: t.asset.name,
      type: t.type,
      quantity: t.quantity.toNumber(),
      price: t.price.toNumber(),
      amount: t.amount.toNumber(),
      gain: t.gain?.toNumber() ?? null,
      tax: t.tax?.toNumber() ?? null,
      createdAt: t.createdAt,
    }));
  }

  async listOrders(playerId: string) {
    const orders = await this.prisma.client.financialAssetOrder.findMany({
      where: { playerId },
      include: { asset: { select: { key: true, name: true } } },
      orderBy: { createdCycle: "desc" },
      take: 50,
    });
    return orders.map((o) => this.toOrderView(o));
  }

  /**
   * Ordre à cours déclenché (cf. domain/financial-assets.ts) — vérifié et
   * exécuté à chaque clôture de cycle (cf. game-engine/cycles.ts), jamais
   * en direct : le prix ne bouge qu'à la clôture, un ordre ne peut donc
   * jamais se déclencher plus vite que ça.
   */
  async createOrder(playerId: string, assetKey: string, input: CreateAssetOrderInput) {
    const asset = await this.prisma.client.financialAsset.findUnique({ where: { key: assetKey } });
    if (!asset) {
      throw new NotFoundException("Actif introuvable");
    }

    if (input.direction === "BUY") {
      if (input.amount === undefined) {
        throw new BadRequestException("Montant requis pour un ordre d'achat");
      }
      const stats = await this.prisma.client.playerStats.findUnique({ where: { playerId } });
      if (!stats || stats.wealthLiquid.toNumber() < input.amount) {
        throw new BadRequestException("Fonds insuffisants pour placer cet ordre");
      }
    } else {
      if (input.quantity === undefined) {
        throw new BadRequestException("Quantité requise pour un ordre de vente");
      }
      const holding = await this.prisma.client.playerAssetHolding.findUnique({
        where: { playerId_assetId: { playerId, assetId: asset.id } },
      });
      const heldQuantity = holding?.quantity.toNumber() ?? 0;
      if (heldQuantity < input.quantity - 1e-9) {
        throw new BadRequestException("Tu ne possèdes pas assez de cet actif pour placer cet ordre");
      }
    }

    const currentCycle = await this.cyclesService.getOrCreateOpenCycle();
    const order = await this.prisma.client.financialAssetOrder.create({
      data: {
        playerId,
        assetId: asset.id,
        direction: input.direction,
        condition: input.condition,
        triggerPrice: input.triggerPrice,
        amount: input.amount,
        quantity: input.quantity,
        createdCycle: currentCycle.number,
      },
      include: { asset: { select: { key: true, name: true } } },
    });
    return this.toOrderView(order);
  }

  async cancelOrder(playerId: string, orderId: string) {
    const order = await this.prisma.client.financialAssetOrder.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException("Cet ordre n'existe plus");
    }
    if (order.playerId !== playerId) {
      throw new ForbiddenException("Cet ordre ne t'appartient pas");
    }
    if (order.status !== "OPEN") {
      throw new BadRequestException("Cet ordre n'est plus ouvert");
    }
    await this.prisma.client.financialAssetOrder.update({ where: { id: orderId }, data: { status: "CANCELLED" } });
    return { cancelled: true };
  }

  private toOrderView(order: {
    id: string;
    asset: { key: string; name: string };
    direction: string;
    condition: string;
    triggerPrice: { toNumber(): number };
    amount: { toNumber(): number } | null;
    quantity: { toNumber(): number } | null;
    status: string;
    createdCycle: number;
    filledCycle: number | null;
  }) {
    return {
      id: order.id,
      assetKey: order.asset.key,
      assetName: order.asset.name,
      direction: order.direction,
      condition: order.condition,
      triggerPrice: order.triggerPrice.toNumber(),
      amount: order.amount?.toNumber() ?? null,
      quantity: order.quantity?.toNumber() ?? null,
      status: order.status,
      createdCycle: order.createdCycle,
      filledCycle: order.filledCycle,
    };
  }

  private toView(
    asset: { id: string; key: string; name: string; type: string; price: { toNumber(): number }; previousPrice: { toNumber(): number } },
    holding: {
      quantity: { toNumber(): number };
      costBasis: { toNumber(): number };
      dividendPolicy: "CASH" | "REINVEST";
    } | null,
  ) {
    const price = asset.price.toNumber();
    const quantity = holding?.quantity.toNumber() ?? 0;
    const costBasis = holding?.costBasis.toNumber() ?? 0;
    const marketValue = quantity * price;

    return {
      id: asset.id,
      key: asset.key,
      name: asset.name,
      type: asset.type,
      sectorName: FINANCIAL_ASSET_CATALOG[asset.key]?.sectorName ?? null,
      dividendRate: FINANCIAL_ASSET_CATALOG[asset.key]?.dividendRate ?? 0,
      volatility: FINANCIAL_ASSET_CATALOG[asset.key]?.volatility ?? 0,
      riskLevel: computeAssetRiskLevel(FINANCIAL_ASSET_CATALOG[asset.key]?.volatility ?? 0),
      price,
      previousPrice: asset.previousPrice.toNumber(),
      quantity,
      costBasis,
      marketValue,
      unrealizedGain: marketValue - costBasis,
      dividendPolicy: holding?.dividendPolicy ?? "CASH",
    };
  }
}
