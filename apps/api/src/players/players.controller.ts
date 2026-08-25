import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { CurrentPlayer } from "../auth/current-player.decorator.js";
import { PlayersService } from "./players.service.js";

@Controller("players")
@UseGuards(JwtAuthGuard)
export class PlayersController {
  constructor(private readonly playersService: PlayersService) {}

  @Get("me")
  async me(@CurrentPlayer() playerId: string) {
    return this.playersService.findMe(playerId);
  }

  @Get("me/wealth-breakdown")
  async wealthBreakdown(@CurrentPlayer() playerId: string) {
    return this.playersService.getWealthBreakdown(playerId);
  }

  @Get("me/wealth-history")
  async wealthHistory(@CurrentPlayer() playerId: string) {
    return this.playersService.getWealthHistory(playerId);
  }

  @Get("me/cycle-report")
  async cycleReport(@CurrentPlayer() playerId: string) {
    return this.playersService.getLatestCycleReport(playerId);
  }
}
