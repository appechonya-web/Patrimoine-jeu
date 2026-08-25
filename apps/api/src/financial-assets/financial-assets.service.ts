import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { FINANCIAL_ASSET_CATALOG } from "@patrimoine-jeu/domain";
import { computeCapitalGainsTax, getCapitalGainsRules } from "@patrimoine-jeu/game-engine";
import { AchievementsService } from "../engagement/achievements.service.js";
import { PrismaService } from "../prisma/prisma.service.js";

@Injectable()
export class FinancialAssetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly achievementsService: AchievementsService,
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

    const holding = await this.prisma.client.$transaction(async (tx) => {
      await tx.playerStats.update({ where: { playerId }, data: { wealthLiquid: { decrement: amount } } });
      return tx.playerAssetHolding.upsert({
        where: { playerId_assetId: { playerId, assetId: asset.id } },
        create: { playerId, assetId: asset.id, quantity, costBasis: amount },
        update: { quantity: { increment: quantity }, costBasis: { increment: amount } },
      });
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
