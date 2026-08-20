import { BadRequestException, Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { buyCommodityInputSchema, sellCommodityInputSchema } from "@patrimoine-jeu/domain";
import { CurrentPlayer } from "../auth/current-player.decorator.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { CommoditiesService } from "./commodities.service.js";

@Controller("commodities")
@UseGuards(JwtAuthGuard)
export class CommoditiesController {
  constructor(private readonly commoditiesService: CommoditiesService) {}

  @Get()
  listMarkets(@CurrentPlayer() playerId: string) {
    return this.commoditiesService.listMarkets(playerId);
  }

  @Post(":sectorId/buy")
  buy(@CurrentPlayer() playerId: string, @Param("sectorId") sectorId: string, @Body() body: unknown) {
    const parsed = buyCommodityInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    return this.commoditiesService.buy(playerId, sectorId, parsed.data);
  }

  @Post(":sectorId/sell")
  sell(@CurrentPlayer() playerId: string, @Param("sectorId") sectorId: string, @Body() body: unknown) {
    const parsed = sellCommodityInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    return this.commoditiesService.sell(playerId, sectorId, parsed.data);
  }
}
