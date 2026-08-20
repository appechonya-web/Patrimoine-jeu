import { BadRequestException, Controller, Get, Query, UseGuards } from "@nestjs/common";
import {
  LEADERBOARD_DEFAULT_LIMIT,
  LEADERBOARD_GROWTH_WINDOWS_CYCLES,
  LEADERBOARD_METRICS,
  type LeaderboardGrowthWindowCycles,
  type LeaderboardMetric,
} from "@patrimoine-jeu/domain";
import { CurrentPlayer } from "../auth/current-player.decorator.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { LeaderboardService } from "./leaderboard.service.js";

@Controller("leaderboard")
@UseGuards(JwtAuthGuard)
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get()
  get(
    @CurrentPlayer() playerId: string,
    @Query("metric") metricParam?: string,
    @Query("window") windowParam?: string,
    @Query("limit") limitParam?: string,
  ) {
    const metric = (metricParam ?? "networth") as LeaderboardMetric;
    if (!LEADERBOARD_METRICS.includes(metric)) {
      throw new BadRequestException("Métrique de classement inconnue");
    }

    const window = Number(windowParam ?? 30) as LeaderboardGrowthWindowCycles;
    if (!LEADERBOARD_GROWTH_WINDOWS_CYCLES.includes(window)) {
      throw new BadRequestException("Fenêtre de croissance invalide");
    }

    const limit = Math.min(100, Math.max(1, Number(limitParam ?? LEADERBOARD_DEFAULT_LIMIT)));

    return this.leaderboardService.getLeaderboard(playerId, metric, window, limit);
  }
}
