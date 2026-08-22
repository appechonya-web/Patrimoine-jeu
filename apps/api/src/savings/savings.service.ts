import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  CYCLES_PER_YEAR,
  PENSION_TERM_CYCLES,
  type DepositSavingsInput,
  type OpenSavingsAccountInput,
  type SavingsProductType,
  type WithdrawSavingsInput,
} from "@patrimoine-jeu/domain";
import {
  computeEarlyWithdrawalAmount,
  computePensionSavingsTaxReduction,
  getPensionSavingsRules,
  resolveSavingsRate,
} from "@patrimoine-jeu/game-engine";
import { CyclesService } from "../cycles/cycles.service.js";
import { AchievementsService } from "../engagement/achievements.service.js";
import { PrismaService } from "../prisma/prisma.service.js";

@Injectable()
export class SavingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cyclesService: CyclesService,
    private readonly achievementsService: AchievementsService,
  ) {}

  async list(playerId: string) {
    const [accounts, currentCycle] = await Promise.all([
      this.prisma.client.savingsAccount.findMany({
        where: { playerId, withdrawnCycle: null },
        orderBy: { openedCycle: "asc" },
      }),
      this.cyclesService.getOrCreateOpenCycle(),
    ]);
    return accounts.map((account) => this.toView(account, currentCycle.number));
  }

  async open(playerId: string, input: OpenSavingsAccountInput) {
    if (input.productType === "compte-terme" && !input.termCycles) {
      throw new BadRequestException("Choisis une durée pour un compte à terme");
    }

    const stats = await this.prisma.client.playerStats.findUnique({ where: { playerId } });
    if (!stats || stats.wealthLiquid.toNumber() < input.amount) {
      throw new BadRequestException("Fonds insuffisants pour ce dépôt");
    }

    const currentCycle = await this.cyclesService.getOrCreateOpenCycle();
    const termCycles =
      input.productType === "livret" ? 0 : input.productType === "pension" ? PENSION_TERM_CYCLES : input.termCycles!;
    const rate = resolveSavingsRate(input.productType, termCycles);

    let taxReduction = 0;
    if (input.productType === "pension") {
      const [rules, contributedThisYear] = await Promise.all([
        getPensionSavingsRules(this.prisma.client),
        this.getPensionContributedThisYear(playerId, currentCycle.number),
      ]);
      taxReduction = computePensionSavingsTaxReduction(
        input.amount,
        contributedThisYear,
        rules.annualCap,
        rules.taxReductionRate,
      ).taxReduction;
    }

    const account = await this.prisma.client.$transaction(async (tx) => {
      await tx.playerStats.update({
        where: { playerId },
        data: { wealthLiquid: { decrement: input.amount - taxReduction } },
      });
      return tx.savingsAccount.create({
        data: {
          playerId,
          productType: input.productType,
          principal: input.amount,
          balance: input.amount,
          rate,
          termCycles,
          openedCycle: currentCycle.number,
        },
      });
    });

    await this.achievementsService.tryUnlock(playerId, "first-savings");

    return { ...this.toView(account, currentCycle.number), taxReduction };
  }

  /**
   * Réservé au livret — un compte à terme/pension a un montant figé à
   * l'ouverture (cf. domain/savings.ts depositSavingsInputSchema), pas
   * alimentable ensuite.
   */
  async deposit(playerId: string, accountId: string, input: DepositSavingsInput) {
    const account = await this.prisma.client.savingsAccount.findUnique({ where: { id: accountId } });
    if (!account || account.playerId !== playerId || account.withdrawnCycle !== null) {
      throw new NotFoundException("Compte d'épargne introuvable");
    }
    if (account.productType !== "livret") {
      throw new BadRequestException("Seul un livret peut être alimenté après ouverture");
    }

    const stats = await this.prisma.client.playerStats.findUnique({ where: { playerId } });
    if (!stats || stats.wealthLiquid.toNumber() < input.amount) {
      throw new BadRequestException("Fonds insuffisants pour ce dépôt");
    }

    const currentCycle = await this.cyclesService.getOrCreateOpenCycle();
    const updated = await this.prisma.client.$transaction(async (tx) => {
      await tx.playerStats.update({ where: { playerId }, data: { wealthLiquid: { decrement: input.amount } } });
      return tx.savingsAccount.update({
        where: { id: accountId },
        data: { principal: { increment: input.amount }, balance: { increment: input.amount } },
      });
    });

    return this.toView(updated, currentCycle.number);
  }

  async getPensionSavingsStatus(playerId: string) {
    const currentCycle = await this.cyclesService.getOrCreateOpenCycle();
    const [rules, contributedThisYear] = await Promise.all([
      getPensionSavingsRules(this.prisma.client),
      this.getPensionContributedThisYear(playerId, currentCycle.number),
    ]);
    return {
      taxReductionRate: rules.taxReductionRate,
      annualCap: rules.annualCap,
      contributedThisYear,
      remainingCap: Math.max(0, rules.annualCap - contributedThisYear),
    };
  }

  private async getPensionContributedThisYear(playerId: string, currentCycleNumber: number): Promise<number> {
    const yearStart = Math.floor(currentCycleNumber / CYCLES_PER_YEAR) * CYCLES_PER_YEAR;
    const result = await this.prisma.client.savingsAccount.aggregate({
      where: {
        playerId,
        productType: "pension",
        openedCycle: { gte: yearStart, lt: yearStart + CYCLES_PER_YEAR },
      },
      _sum: { principal: true },
    });
    return result._sum.principal?.toNumber() ?? 0;
  }

  async withdraw(playerId: string, accountId: string, input: WithdrawSavingsInput) {
    const account = await this.prisma.client.savingsAccount.findUnique({ where: { id: accountId } });
    if (!account || account.playerId !== playerId || account.withdrawnCycle !== null) {
      throw new NotFoundException("Compte d'épargne introuvable");
    }

    const currentCycle = await this.cyclesService.getOrCreateOpenCycle();
    const balance = account.balance.toNumber();
    const isMature = account.termCycles === 0 || currentCycle.number - account.openedCycle >= account.termCycles;

    if (account.productType !== "livret") {
      if (input.amount !== undefined && input.amount < balance - 0.01) {
        throw new BadRequestException("Ce produit ne permet pas de retrait partiel — retire le solde complet");
      }
      const payout = isMature
        ? balance
        : computeEarlyWithdrawalAmount(account.productType as SavingsProductType, account.principal.toNumber());

      await this.prisma.client.$transaction(async (tx) => {
        await tx.playerStats.update({ where: { playerId }, data: { wealthLiquid: { increment: payout } } });
        await tx.savingsAccount.update({
          where: { id: accountId },
          data: { balance: 0, withdrawnCycle: currentCycle.number },
        });
      });

      return { withdrawn: payout, early: !isMature };
    }

    const amount = input.amount ?? balance;
    if (amount > balance + 0.01) {
      throw new BadRequestException("Solde insuffisant");
    }
    const remaining = Math.max(0, balance - amount);

    await this.prisma.client.$transaction(async (tx) => {
      await tx.playerStats.update({ where: { playerId }, data: { wealthLiquid: { increment: amount } } });
      await tx.savingsAccount.update({
        where: { id: accountId },
        data:
          remaining <= 0.01
            ? { balance: 0, withdrawnCycle: currentCycle.number }
            : { balance: remaining },
      });
    });

    return { withdrawn: amount, early: false };
  }

  private toView(
    account: {
      id: string;
      productType: string;
      principal: { toNumber(): number };
      balance: { toNumber(): number };
      rate: { toNumber(): number };
      termCycles: number;
      openedCycle: number;
    },
    currentCycleNumber: number,
  ) {
    const maturityCycle = account.termCycles > 0 ? account.openedCycle + account.termCycles : null;
    return {
      id: account.id,
      productType: account.productType,
      principal: account.principal.toNumber(),
      balance: account.balance.toNumber(),
      rate: account.rate.toNumber(),
      termCycles: account.termCycles,
      openedCycle: account.openedCycle,
      maturityCycle,
      isMature: maturityCycle === null || currentCycleNumber >= maturityCycle,
    };
  }
}
