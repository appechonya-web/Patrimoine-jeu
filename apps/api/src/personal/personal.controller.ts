import { BadRequestException, Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { PERSONAL_ACTION_IDS, investPersonalInputSchema, type PersonalActionId } from "@patrimoine-jeu/domain";
import { CurrentPlayer } from "../auth/current-player.decorator.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { PersonalService } from "./personal.service.js";

@Controller("personal")
@UseGuards(JwtAuthGuard)
export class PersonalController {
  constructor(private readonly personalService: PersonalService) {}

  @Get()
  getOverview(@CurrentPlayer() playerId: string) {
    return this.personalService.getOverview(playerId);
  }

  @Get("wellbeing-cycle-lines")
  getLatestWellbeingCycleLines(@CurrentPlayer() playerId: string) {
    return this.personalService.getLatestWellbeingCycleLines(playerId);
  }

  @Post("invest")
  invest(@CurrentPlayer() playerId: string, @Body() body: unknown) {
    const parsed = investPersonalInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.personalService.invest(playerId, parsed.data);
  }

  @Post("actions/:id")
  performAction(@CurrentPlayer() playerId: string, @Param("id") actionId: string) {
    if (!PERSONAL_ACTION_IDS.includes(actionId as PersonalActionId)) {
      throw new BadRequestException("Action inconnue");
    }
    return this.personalService.performAction(playerId, actionId as PersonalActionId);
  }
}
