import { BadRequestException, Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { openSavingsAccountInputSchema, withdrawSavingsInputSchema } from "@patrimoine-jeu/domain";
import { CurrentPlayer } from "../auth/current-player.decorator.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { SavingsService } from "./savings.service.js";

@Controller("savings")
@UseGuards(JwtAuthGuard)
export class SavingsController {
  constructor(private readonly savingsService: SavingsService) {}

  @Get()
  list(@CurrentPlayer() playerId: string) {
    return this.savingsService.list(playerId);
  }

  @Get("pension-status")
  pensionStatus(@CurrentPlayer() playerId: string) {
    return this.savingsService.getPensionSavingsStatus(playerId);
  }

  @Post()
  open(@CurrentPlayer() playerId: string, @Body() body: unknown) {
    const parsed = openSavingsAccountInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.savingsService.open(playerId, parsed.data);
  }

  @Post(":id/withdraw")
  withdraw(@CurrentPlayer() playerId: string, @Param("id") accountId: string, @Body() body: unknown) {
    const parsed = withdrawSavingsInputSchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.savingsService.withdraw(playerId, accountId, parsed.data);
  }
}
