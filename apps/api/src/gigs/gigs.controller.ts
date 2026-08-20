import { BadRequestException, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { GIG_IDS, type GigId } from "@patrimoine-jeu/domain";
import { CurrentPlayer } from "../auth/current-player.decorator.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { GigsService } from "./gigs.service.js";

@Controller("gigs")
@UseGuards(JwtAuthGuard)
export class GigsController {
  constructor(private readonly gigsService: GigsService) {}

  @Get()
  list(@CurrentPlayer() playerId: string) {
    return this.gigsService.list(playerId);
  }

  @Post(":id/perform")
  perform(@CurrentPlayer() playerId: string, @Param("id") gigId: string) {
    if (!GIG_IDS.includes(gigId as GigId)) {
      throw new BadRequestException("Petit boulot inconnu");
    }
    return this.gigsService.perform(playerId, gigId as GigId);
  }
}
