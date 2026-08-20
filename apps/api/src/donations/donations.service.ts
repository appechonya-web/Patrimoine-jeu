import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  CAUSE_CATALOG,
  CAUSE_DONATION_ANNUAL_CAP,
  CAUSE_DONATION_TAX_REDUCTION_RATE,
  CAUSE_LIST,
  CYCLES_PER_YEAR,
  PLAYER_DONATION_GIFT_TAX_RATE,
  type DonateToCauseInput,
  type DonateToPlayerInput,
} from "@patrimoine-jeu/domain";
import { computeCauseDonationTaxReduction } from "@patrimoine-jeu/game-engine";
import { CyclesService } from "../cycles/cycles.service.js";
import { AchievementsService } from "../engagement/achievements.service.js";
import { PrismaService } from "../prisma/prisma.service.js";

@Injectable()
export class DonationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cyclesService: CyclesService,
    private readonly achievementsService: AchievementsService,
  ) {}

  listCauses() {
    return CAUSE_LIST;
  }

  /**
   * Don entre joueurs — pas de lien de parenté modélisé, taxé aux droits
   * de donation "entre tiers" (cf. domain/donations.ts). Le destinataire
   * ne reçoit que le net, la taxe s'évapore (aucune entité étatique à
   * créditer dans ce jeu, comme pour les autres droits déjà modélisés).
   */
  async donateToPlayer(playerId: string, input: DonateToPlayerInput) {
    const recipient = await this.prisma.client.player.findUnique({ where: { pseudo: input.recipientPseudo } });
    if (!recipient) {
      throw new NotFoundException("Joueur destinataire introuvable");
    }
    if (recipient.id === playerId) {
      throw new BadRequestException("Tu ne peux pas te faire un don à toi-même");
    }

    const stats = await this.prisma.client.playerStats.findUnique({ where: { playerId } });
    if (!stats || stats.wealthLiquid.toNumber() < input.amount) {
      throw new BadRequestException("Fonds insuffisants pour ce don");
    }

    const tax = input.amount * PLAYER_DONATION_GIFT_TAX_RATE;
    const net = input.amount - tax;
    const currentCycle = await this.cyclesService.getOrCreateOpenCycle();

    await this.prisma.client.$transaction(async (tx) => {
      await tx.playerStats.update({ where: { playerId }, data: { wealthLiquid: { decrement: input.amount } } });
      await tx.playerStats.update({ where: { playerId: recipient.id }, data: { wealthLiquid: { increment: net } } });
      await tx.playerNotification.create({
        data: {
          playerId: recipient.id,
          type: "donation-received",
          message: `Tu as reçu un don de ${net.toFixed(0)} € (droits de donation déjà déduits).`,
          cycle: currentCycle.number,
        },
      });
    });

    await this.achievementsService.tryUnlock(playerId, "first-donation");

    return { sent: input.amount, tax, net };
  }

  async donateToCause(playerId: string, input: DonateToCauseInput) {
    const definition = CAUSE_CATALOG[input.causeId];
    const stats = await this.prisma.client.playerStats.findUnique({ where: { playerId } });
    if (!stats || stats.wealthLiquid.toNumber() < input.amount) {
      throw new BadRequestException("Fonds insuffisants pour ce don");
    }

    const currentCycle = await this.cyclesService.getOrCreateOpenCycle();
    const alreadyDonated = await this.getDonatedThisYear(playerId, currentCycle.number);
    const { taxReduction } = computeCauseDonationTaxReduction(
      input.amount,
      alreadyDonated,
      CAUSE_DONATION_ANNUAL_CAP,
      CAUSE_DONATION_TAX_REDUCTION_RATE,
    );
    const netCost = input.amount - taxReduction;

    await this.prisma.client.$transaction(async (tx) => {
      await tx.playerStats.update({ where: { playerId }, data: { wealthLiquid: { decrement: netCost } } });
      await tx.causeDonation.create({
        data: { playerId, causeId: input.causeId, amount: input.amount, donatedCycle: currentCycle.number },
      });
    });

    await this.achievementsService.tryUnlock(playerId, "first-donation");

    return { donated: input.amount, taxReduction, netCost, causeName: definition.name };
  }

  async getCauseDonationStatus(playerId: string) {
    const currentCycle = await this.cyclesService.getOrCreateOpenCycle();
    const alreadyDonated = await this.getDonatedThisYear(playerId, currentCycle.number);
    return {
      taxReductionRate: CAUSE_DONATION_TAX_REDUCTION_RATE,
      annualCap: CAUSE_DONATION_ANNUAL_CAP,
      donatedThisYear: alreadyDonated,
      remainingCap: Math.max(0, CAUSE_DONATION_ANNUAL_CAP - alreadyDonated),
    };
  }

  private async getDonatedThisYear(playerId: string, currentCycleNumber: number): Promise<number> {
    const yearStart = Math.floor(currentCycleNumber / CYCLES_PER_YEAR) * CYCLES_PER_YEAR;
    const result = await this.prisma.client.causeDonation.aggregate({
      where: { playerId, donatedCycle: { gte: yearStart, lt: yearStart + CYCLES_PER_YEAR } },
      _sum: { amount: true },
    });
    return result._sum.amount?.toNumber() ?? 0;
  }
}
