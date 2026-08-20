import { Controller, Get, Post, UseGuards } from "@nestjs/common";
import { CurrentPlayer } from "../auth/current-player.decorator.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { AchievementsService } from "./achievements.service.js";
import { DailyBonusService } from "./daily-bonus.service.js";

@Controller("engagement")
@UseGuards(JwtAuthGuard)
export class EngagementController {
  constructor(
    private readonly achievementsService: AchievementsService,
    private readonly dailyBonusService: DailyBonusService,
  ) {}

  @Get("achievements")
  listAchievements(@CurrentPlayer() playerId: string) {
    return this.achievementsService.list(playerId);
  }

  @Get("daily-bonus")
  dailyBonusStatus(@CurrentPlayer() playerId: string) {
    return this.dailyBonusService.status(playerId);
  }

  @Post("daily-bonus/claim")
  claimDailyBonus(@CurrentPlayer() playerId: string) {
    return this.dailyBonusService.claim(playerId);
  }
}
