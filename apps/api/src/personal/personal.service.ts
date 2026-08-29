import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  PERSONAL_ACTION_CATALOG,
  PERSONAL_ACTION_COOLDOWN_CYCLES,
  PERSONAL_ACTION_LIST,
  PERSONAL_AXES,
  PERSONAL_AXIS_DESCRIPTIONS,
  PERSONAL_AXIS_LABELS,
  type InvestPersonalInput,
  type PersonalActionId,
  type PersonalAxis,
} from "@patrimoine-jeu/domain";
import { clampStat, computeEffectivePersonalInvestmentLevel } from "@patrimoine-jeu/game-engine";
import { CyclesService } from "../cycles/cycles.service.js";
import { PrismaService } from "../prisma/prisma.service.js";

const COOLDOWN_MESSAGE = "Une seule action de ce type par semaine — reviens plus tard";

const INVESTMENT_FIELD_BY_AXIS: Record<PersonalAxis, "sportInvestment" | "nutritionInvestment" | "socialInvestment" | "comfortInvestment"> = {
  sport: "sportInvestment",
  nutrition: "nutritionInvestment",
  social: "socialInvestment",
  comfort: "comfortInvestment",
};

@Injectable()
export class PersonalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cyclesService: CyclesService,
  ) {}

  /**
   * Détail ligne par ligne du dernier cycle clôturé (cf.
   * PlayerWellbeingCycleLine) — répond à "pourquoi mon bien-être bouge",
   * même principe que CompanyCycleReportLine côté entreprise.
   */
  async getLatestWellbeingCycleLines(playerId: string) {
    const latestLine = await this.prisma.client.playerWellbeingCycleLine.findFirst({
      where: { playerId },
      orderBy: { cycle: { number: "desc" } },
    });
    if (!latestLine) return [];

    const lines = await this.prisma.client.playerWellbeingCycleLine.findMany({
      where: { playerId, cycleId: latestLine.cycleId },
      orderBy: { delta: "asc" },
    });
    return lines.map((line) => ({
      category: line.category,
      sourceId: line.sourceId,
      label: line.label,
      delta: line.delta.toNumber(),
    }));
  }

  async getOverview(playerId: string) {
    const [stats, cooldowns, currentCycle] = await Promise.all([
      this.prisma.client.playerStats.findUnique({ where: { playerId } }),
      this.prisma.client.playerActionCooldown.findMany({
        where: { playerId, actionType: { in: this.allCooldownActionTypes() } },
      }),
      this.cyclesService.getOrCreateOpenCycle(),
    ]);
    if (!stats) {
      throw new NotFoundException("Joueur introuvable");
    }

    const lastCycleByAction = new Map(cooldowns.map((c) => [c.actionType, c.lastCycle]));

    const axes = PERSONAL_AXES.map((axis) => {
      const investment = stats[INVESTMENT_FIELD_BY_AXIS[axis]].toNumber();
      const lastCycle = lastCycleByAction.get(`personal-invest:${axis}`);
      const cyclesRemaining =
        lastCycle === undefined ? 0 : Math.max(0, PERSONAL_ACTION_COOLDOWN_CYCLES - (currentCycle.number - lastCycle));
      return {
        axis,
        label: PERSONAL_AXIS_LABELS[axis],
        description: PERSONAL_AXIS_DESCRIPTIONS[axis],
        investment,
        level: computeEffectivePersonalInvestmentLevel(investment),
        cyclesRemaining,
        available: cyclesRemaining === 0,
      };
    });

    const actions = PERSONAL_ACTION_LIST.map((action) => {
      const lastCycle = lastCycleByAction.get(`personal-action:${action.id}`);
      const cyclesRemaining =
        lastCycle === undefined ? 0 : Math.max(0, action.cooldownCycles - (currentCycle.number - lastCycle));
      return { ...action, cyclesRemaining, available: cyclesRemaining === 0 };
    });

    return { wellbeing: stats.wellbeing.toNumber(), axes, actions };
  }

  async invest(playerId: string, input: InvestPersonalInput) {
    const stats = await this.prisma.client.playerStats.findUnique({ where: { playerId } });
    if (!stats || stats.wealthLiquid.toNumber() < input.amount) {
      throw new BadRequestException("Fonds insuffisants pour cet investissement");
    }

    const field = INVESTMENT_FIELD_BY_AXIS[input.axis];
    const actionType = `personal-invest:${input.axis}`;
    const currentCycle = await this.cyclesService.getOrCreateOpenCycle();

    await this.prisma.client.$transaction(async (tx) => {
      const cooldown = await tx.playerActionCooldown.findUnique({
        where: { playerId_actionType: { playerId, actionType } },
      });
      if (cooldown && currentCycle.number - cooldown.lastCycle < PERSONAL_ACTION_COOLDOWN_CYCLES) {
        throw new BadRequestException(COOLDOWN_MESSAGE);
      }

      await tx.playerActionCooldown.upsert({
        where: { playerId_actionType: { playerId, actionType } },
        create: { playerId, actionType, lastCycle: currentCycle.number },
        update: { lastCycle: currentCycle.number },
      });

      await tx.playerStats.update({
        where: { playerId },
        data: { wealthLiquid: { decrement: input.amount }, [field]: { increment: input.amount } },
      });
    });

    return this.getOverview(playerId);
  }

  async performAction(playerId: string, actionId: PersonalActionId) {
    const action = PERSONAL_ACTION_CATALOG[actionId];
    if (!action) {
      throw new NotFoundException("Action introuvable");
    }

    const [stats, currentCycle] = await Promise.all([
      this.prisma.client.playerStats.findUnique({ where: { playerId } }),
      this.cyclesService.getOrCreateOpenCycle(),
    ]);
    if (!stats || stats.wealthLiquid.toNumber() < action.cost) {
      throw new BadRequestException("Fonds insuffisants pour cette action");
    }

    const actionType = `personal-action:${actionId}`;

    await this.prisma.client.$transaction(async (tx) => {
      const cooldown = await tx.playerActionCooldown.findUnique({
        where: { playerId_actionType: { playerId, actionType } },
      });
      if (cooldown && currentCycle.number - cooldown.lastCycle < action.cooldownCycles) {
        throw new BadRequestException(COOLDOWN_MESSAGE);
      }

      await tx.playerActionCooldown.upsert({
        where: { playerId_actionType: { playerId, actionType } },
        create: { playerId, actionType, lastCycle: currentCycle.number },
        update: { lastCycle: currentCycle.number },
      });

      await tx.playerStats.update({
        where: { playerId },
        data: {
          wealthLiquid: { decrement: action.cost },
          wellbeing: clampStat(stats.wellbeing.toNumber() + action.wellbeingBoost),
        },
      });
    });

    return this.getOverview(playerId);
  }

  private allCooldownActionTypes(): string[] {
    return [
      ...PERSONAL_AXES.map((axis) => `personal-invest:${axis}`),
      ...PERSONAL_ACTION_LIST.map((action) => `personal-action:${action.id}`),
    ];
  }
}
