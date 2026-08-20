import { Injectable } from "@nestjs/common";
import { LEADERBOARD_DEFAULT_LIMIT, type LeaderboardGrowthWindowCycles, type LeaderboardMetric } from "@patrimoine-jeu/domain";
import { CyclesService } from "../cycles/cycles.service.js";
import { PrismaService } from "../prisma/prisma.service.js";

interface RankableRow {
  playerId: string;
  pseudo: string;
  value: number;
}

@Injectable()
export class LeaderboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cyclesService: CyclesService,
  ) {}

  async getLeaderboard(
    playerId: string,
    metric: LeaderboardMetric,
    windowCycles: LeaderboardGrowthWindowCycles,
    limit = LEADERBOARD_DEFAULT_LIMIT,
  ) {
    const rows = metric === "growth" ? await this.growthRows(windowCycles) : await this.statsFieldRows(metric);
    return this.buildResult(rows, playerId, limit);
  }

  private async statsFieldRows(metric: Exclude<LeaderboardMetric, "growth">): Promise<RankableRow[]> {
    const field = metric === "networth" ? "netWorth" : metric;
    const stats = await this.prisma.client.playerStats.findMany({ include: { player: { select: { pseudo: true } } } });
    return stats.map((row) => ({
      playerId: row.playerId,
      pseudo: row.player.pseudo,
      value: row[field].toNumber(),
    }));
  }

  private async growthRows(windowCycles: number): Promise<RankableRow[]> {
    const currentCycle = await this.cyclesService.getOrCreateOpenCycle();
    const targetCycleNumber = Math.max(0, currentCycle.number - windowCycles);

    const players = await this.prisma.client.player.findMany({ include: { stats: true } });

    return Promise.all(
      players
        .filter((player) => player.stats)
        .map(async (player) => {
          const baseline =
            (await this.prisma.client.playerStatHistory.findFirst({
              where: { playerId: player.id, cycle: { number: { lte: targetCycleNumber } } },
              orderBy: { cycle: { number: "desc" } },
            })) ??
            (await this.prisma.client.playerStatHistory.findFirst({
              where: { playerId: player.id },
              orderBy: { cycle: { number: "asc" } },
            }));

          const baselineNetWorth = baseline?.netWorth.toNumber() ?? 0;
          const value = player.stats!.netWorth.toNumber() - baselineNetWorth;
          return { playerId: player.id, pseudo: player.pseudo, value };
        }),
    );
  }

  /**
   * Classe et tronque au top `limit`, mais garde toujours la ligne du
   * joueur courant même hors top N — inutile de scroller pour savoir où on
   * en est.
   */
  private buildResult(rows: RankableRow[], currentPlayerId: string, limit: number) {
    const ranked = [...rows]
      .sort((a, b) => b.value - a.value)
      .map((row, index) => ({ rank: index + 1, ...row, isMe: row.playerId === currentPlayerId }));

    const top = ranked.slice(0, limit);
    if (top.some((row) => row.isMe)) return top;

    const me = ranked.find((row) => row.isMe);
    return me ? [...top, me] : top;
  }
}
