import { BadRequestException, Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { donateToCauseInputSchema, donateToPlayerInputSchema } from "@patrimoine-jeu/domain";
import { CurrentPlayer } from "../auth/current-player.decorator.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { DonationsService } from "./donations.service.js";

@Controller("donations")
@UseGuards(JwtAuthGuard)
export class DonationsController {
  constructor(private readonly donationsService: DonationsService) {}

  @Get("causes")
  listCauses() {
    return this.donationsService.listCauses();
  }

  @Get("causes/status")
  getCauseDonationStatus(@CurrentPlayer() playerId: string) {
    return this.donationsService.getCauseDonationStatus(playerId);
  }

  @Post("to-player")
  donateToPlayer(@CurrentPlayer() playerId: string, @Body() body: unknown) {
    const parsed = donateToPlayerInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.donationsService.donateToPlayer(playerId, parsed.data);
  }

  @Post("to-cause")
  donateToCause(@CurrentPlayer() playerId: string, @Body() body: unknown) {
    const parsed = donateToCauseInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.donationsService.donateToCause(playerId, parsed.data);
  }
}
