import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { computeDailyBonusReward, isConsecutiveCalendarDay, toUtcDateString } from "@patrimoine-jeu/game-engine";
import { PrismaService } from "../prisma/prisma.service.js";

@Injectable()
export class DailyBonusService {
  constructor(private readonly prisma: PrismaService) {}

  async status(playerId: string) {
    const stats = await this.prisma.client.playerStats.findUnique({ where: { playerId } });
    if (!stats) {
      throw new NotFoundException("Joueur introuvable");
    }

    const today = toUtcDateString(new Date());
    const lastClaimed = stats.lastDailyBonusClaimedAt ? toUtcDateString(stats.lastDailyBonusClaimedAt) : null;
    const claimedToday = lastClaimed === today;
    const projectedStreak = claimedToday
      ? stats.dailyBonusStreak
      : lastClaimed && isConsecutiveCalendarDay(lastClaimed, today)
        ? stats.dailyBonusStreak + 1
        : 1;

    return {
      streak: stats.dailyBonusStreak,
      claimedToday,
      nextReward: computeDailyBonusReward(projectedStreak),
    };
  }

  async claim(playerId: string): Promise<{ reward: number; streak: number }> {
    const stats = await this.prisma.client.playerStats.findUnique({ where: { playerId } });
    if (!stats) {
      throw new NotFoundException("Joueur introuvable");
    }

    const now = new Date();
    const today = toUtcDateString(now);
    const lastClaimed = stats.lastDailyBonusClaimedAt ? toUtcDateString(stats.lastDailyBonusClaimedAt) : null;

    if (lastClaimed === today) {
      throw new BadRequestException("Bonus déjà réclamé aujourd'hui — reviens demain");
    }

    const newStreak = lastClaimed && isConsecutiveCalendarDay(lastClaimed, today) ? stats.dailyBonusStreak + 1 : 1;
    const reward = computeDailyBonusReward(newStreak);

    await this.prisma.client.playerStats.update({
      where: { playerId },
      data: {
        wealthLiquid: { increment: reward },
        dailyBonusStreak: newStreak,
        lastDailyBonusClaimedAt: now,
      },
    });

    return { reward, streak: newStreak };
  }
}
