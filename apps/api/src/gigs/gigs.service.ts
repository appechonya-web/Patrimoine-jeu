import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { GIG_CATALOG, GIG_LIST, type GigId } from "@patrimoine-jeu/domain";
import { clampStat, computeGigReward } from "@patrimoine-jeu/game-engine";
import { CyclesService } from "../cycles/cycles.service.js";
import { AchievementsService } from "../engagement/achievements.service.js";
import { PrismaService } from "../prisma/prisma.service.js";

const COOLDOWN_MESSAGE = "Ce petit boulot n'est pas encore disponible, reviens plus tard";

@Injectable()
export class GigsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cyclesService: CyclesService,
    private readonly achievementsService: AchievementsService,
  ) {}

  async list(playerId: string) {
    const [cooldowns, stats] = await Promise.all([
      this.prisma.client.playerActionCooldown.findMany({ where: { playerId, actionType: { startsWith: "gig:" } } }),
      this.prisma.client.playerStats.findUnique({ where: { playerId } }),
    ]);
    const lastPlayedByGig = new Map(cooldowns.map((c) => [c.actionType.slice("gig:".length), c.lastPlayedAt]));
    const reputation = stats?.reputation.toNumber() ?? 50;
    const now = Date.now();

    return GIG_LIST.map((gig) => {
      const lastPlayedAt = lastPlayedByGig.get(gig.id);
      const secondsRemaining = lastPlayedAt
        ? Math.max(0, gig.cooldownSeconds - Math.floor((now - lastPlayedAt.getTime()) / 1000))
        : 0;
      const unlocked = reputation >= gig.minReputation;
      return {
        ...gig,
        unlocked,
        secondsRemaining,
        available: unlocked && secondsRemaining === 0,
      };
    });
  }

  async perform(playerId: string, gigId: GigId) {
    const gig = GIG_CATALOG[gigId];
    if (!gig) {
      throw new NotFoundException("Petit boulot inconnu");
    }

    const [stats, currentCycle] = await Promise.all([
      this.prisma.client.playerStats.findUnique({ where: { playerId } }),
      this.cyclesService.getOrCreateOpenCycle(),
    ]);
    if (!stats) {
      throw new NotFoundException("Joueur introuvable");
    }
    if (stats.reputation.toNumber() < gig.minReputation) {
      throw new BadRequestException(`Réputation insuffisante pour ce petit boulot (minimum ${gig.minReputation})`);
    }

    const actionType = `gig:${gigId}`;
    const reward = computeGigReward(gig);
    const now = new Date();

    await this.prisma.client.$transaction(async (tx) => {
      const cooldown = await tx.playerActionCooldown.findUnique({
        where: { playerId_actionType: { playerId, actionType } },
      });
      if (cooldown?.lastPlayedAt && now.getTime() - cooldown.lastPlayedAt.getTime() < gig.cooldownSeconds * 1000) {
        throw new BadRequestException(COOLDOWN_MESSAGE);
      }

      await tx.playerActionCooldown.upsert({
        where: { playerId_actionType: { playerId, actionType } },
        create: { playerId, actionType, lastCycle: currentCycle.number, lastPlayedAt: now },
        update: { lastCycle: currentCycle.number, lastPlayedAt: now },
      });

      await tx.playerStats.update({
        where: { playerId },
        data: {
          wealthLiquid: { increment: reward },
          wellbeing: clampStat(stats.wellbeing.toNumber() - gig.wellbeingCost),
        },
      });
    });

    await this.achievementsService.tryUnlock(playerId, "first-gig");

    return { gigId, reward, wellbeingCost: gig.wellbeingCost };
  }
}
