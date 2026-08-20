import { BadRequestException, Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { buyPersonalGoodInputSchema } from "@patrimoine-jeu/domain";
import { CurrentPlayer } from "../auth/current-player.decorator.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { PersonalGoodsService } from "./personal-goods.service.js";

@Controller("personal-goods")
@UseGuards(JwtAuthGuard)
export class PersonalGoodsController {
  constructor(private readonly personalGoodsService: PersonalGoodsService) {}

  @Get()
  list(@CurrentPlayer() playerId: string) {
    return this.personalGoodsService.list(playerId);
  }

  @Post()
  buy(@CurrentPlayer() playerId: string, @Body() body: unknown) {
    const parsed = buyPersonalGoodInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.personalGoodsService.buy(playerId, parsed.data);
  }

  @Post(":id/sell")
  sell(@CurrentPlayer() playerId: string, @Param("id") goodInstanceId: string) {
    return this.personalGoodsService.sell(playerId, goodInstanceId);
  }
}
