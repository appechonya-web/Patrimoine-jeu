import { Injectable } from "@nestjs/common";
import { ACHIEVEMENT_CATALOG, ACHIEVEMENT_LIST, type AchievementId } from "@patrimoine-jeu/domain";
import { CyclesService } from "../cycles/cycles.service.js";
import { PrismaService } from "../prisma/prisma.service.js";

@Injectable()
export class AchievementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cyclesService: CyclesService,
  ) {}

  async list(playerId: string) {
    const unlocked = await this.prisma.client.playerAchievement.findMany({ where: { playerId } });
    const unlockedAtById = new Map(unlocked.map((u) => [u.achievementId, u.unlockedAt]));

    return ACHIEVEMENT_LIST.map((achievement) => ({
      ...achievement,
      unlocked: unlockedAtById.has(achievement.id),
      unlockedAt: unlockedAtById.get(achievement.id) ?? null,
    }));
  }

  /**
   * Débloque un défi s'il ne l'est pas déjà — idempotent, à appeler sans
   * condition depuis l'action déclenchante (prendre un emploi, faire un
   * petit boulot...) : un rejeu (changement de job, deuxième petit boulot)
   * ne rapporte rien de plus, cf. domain/achievements.ts.
   */
  async tryUnlock(playerId: string, achievementId: AchievementId): Promise<{ unlocked: boolean; reward: number }> {
    const existing = await this.prisma.client.playerAchievement.findUnique({
      where: { playerId_achievementId: { playerId, achievementId } },
    });
    if (existing) {
      return { unlocked: false, reward: 0 };
    }

    const definition = ACHIEVEMENT_CATALOG[achievementId];
    const currentCycle = await this.cyclesService.getOrCreateOpenCycle();

    await this.prisma.client.$transaction(async (tx) => {
      await tx.playerAchievement.create({ data: { playerId, achievementId } });
      await tx.playerStats.update({ where: { playerId }, data: { wealthLiquid: { increment: definition.reward } } });
      await tx.playerNotification.create({
        data: {
          playerId,
          type: "achievement-unlocked",
          message: `Défi débloqué : ${definition.label} (+${definition.reward.toFixed(0)} €)`,
          cycle: currentCycle.number,
        },
      });
    });

    return { unlocked: true, reward: definition.reward };
  }
}
