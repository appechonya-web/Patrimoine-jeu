import { BadRequestException, Controller, Delete, Get, Post, Query, UseGuards, Body } from "@nestjs/common";
import { startIndependentActivityInputSchema } from "@patrimoine-jeu/domain";
import { CurrentPlayer } from "../auth/current-player.decorator.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { IndependentActivityService } from "./independent-activity.service.js";

@Controller("independent-activity")
@UseGuards(JwtAuthGuard)
export class IndependentActivityController {
  constructor(private readonly independentActivityService: IndependentActivityService) {}

  @Get()
  get(@CurrentPlayer() playerId: string) {
    return this.independentActivityService.get(playerId);
  }

  @Get("estimate")
  estimate(@CurrentPlayer() playerId: string, @Query("grossRevenuePerCycle") grossRevenuePerCycle: string) {
    const parsed = Number(grossRevenuePerCycle);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new BadRequestException("grossRevenuePerCycle invalide");
    }
    return this.independentActivityService.estimate(playerId, parsed);
  }

  @Post()
  start(@CurrentPlayer() playerId: string, @Body() body: unknown) {
    const parsed = startIndependentActivityInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.independentActivityService.start(playerId, parsed.data);
  }

  @Delete()
  stop(@CurrentPlayer() playerId: string) {
    return this.independentActivityService.stop(playerId);
  }
}
