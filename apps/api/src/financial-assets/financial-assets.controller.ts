import { BadRequestException, Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { buyAssetInputSchema, sellAssetInputSchema } from "@patrimoine-jeu/domain";
import { CurrentPlayer } from "../auth/current-player.decorator.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { FinancialAssetsService } from "./financial-assets.service.js";

@Controller("financial-assets")
@UseGuards(JwtAuthGuard)
export class FinancialAssetsController {
  constructor(private readonly financialAssetsService: FinancialAssetsService) {}

  @Get()
  list(@CurrentPlayer() playerId: string) {
    return this.financialAssetsService.list(playerId);
  }

  @Post(":key/buy")
  buy(@CurrentPlayer() playerId: string, @Param("key") key: string, @Body() body: unknown) {
    const parsed = buyAssetInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.financialAssetsService.buy(playerId, key, parsed.data.amount);
  }

  @Post(":key/sell")
  sell(@CurrentPlayer() playerId: string, @Param("key") key: string, @Body() body: unknown) {
    const parsed = sellAssetInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.financialAssetsService.sell(playerId, key, parsed.data.quantity);
  }
}
