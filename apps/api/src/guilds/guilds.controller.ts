import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import {
  foundGuildInputSchema,
  joinGuildInputSchema,
  postGuildMessageInputSchema,
  setGuildPriceFloorInputSchema,
} from "@patrimoine-jeu/domain";
import { CurrentPlayer } from "../auth/current-player.decorator.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { GuildsService } from "./guilds.service.js";

@Controller("guilds")
@UseGuards(JwtAuthGuard)
export class GuildsController {
  constructor(private readonly guildsService: GuildsService) {}

  @Get()
  list(@Query("sectorId") sectorId?: string) {
    return this.guildsService.listBySector(sectorId);
  }

  @Post()
  found(@CurrentPlayer() playerId: string, @Body() body: unknown) {
    const parsed = foundGuildInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.guildsService.found(playerId, parsed.data);
  }

  @Post(":id/join")
  join(@CurrentPlayer() playerId: string, @Param("id") guildId: string, @Body() body: unknown) {
    const parsed = joinGuildInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.guildsService.join(playerId, guildId, parsed.data);
  }

  @Delete(":id/members/:companyId")
  leave(@CurrentPlayer() playerId: string, @Param("id") guildId: string, @Param("companyId") companyId: string) {
    return this.guildsService.leave(playerId, guildId, companyId);
  }

  @Post(":id/price-floor")
  setPriceFloor(@CurrentPlayer() playerId: string, @Param("id") guildId: string, @Body() body: unknown) {
    const parsed = setGuildPriceFloorInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.guildsService.setPriceFloor(playerId, guildId, parsed.data);
  }

  @Get(":id/messages")
  listMessages(@CurrentPlayer() playerId: string, @Param("id") guildId: string) {
    return this.guildsService.listMessages(playerId, guildId);
  }

  @Post(":id/messages")
  postMessage(@CurrentPlayer() playerId: string, @Param("id") guildId: string, @Body() body: unknown) {
    const parsed = postGuildMessageInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.guildsService.postMessage(playerId, guildId, parsed.data);
  }
}
