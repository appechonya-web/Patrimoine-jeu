import { Controller, Get, HttpCode, Post, UseGuards } from "@nestjs/common";
import { CyclesService } from "./cycles.service.js";
import { InternalSecretGuard } from "./internal-secret.guard.js";

@Controller("cycles")
export class CyclesController {
  constructor(private readonly cyclesService: CyclesService) {}

  @Get("current")
  async current() {
    const cycle = await this.cyclesService.getOrCreateOpenCycle();
    return {
      number: cycle.number,
      status: cycle.status,
      startedAt: cycle.startedAt,
      closesAt: new Date(cycle.startedAt.getTime() + this.cyclesService.durationMs),
      durationMs: this.cyclesService.durationMs,
    };
  }

  /**
   * Déclenchée par un cron externe (cf. .github/workflows/close-cycle.yml),
   * jamais par un joueur — remplace le worker BullMQ/Redis pour rester
   * déployable gratuitement (pas de processus permanent nécessaire). No-op
   * si le cycle en cours n'a pas encore atteint sa durée normale (cf.
   * CyclesService.closeCycleIfDue) : appeler cette route plus souvent que
   * la cadence réelle du jeu ne clôture rien en trop.
   */
  @Post("internal-close")
  @HttpCode(200)
  @UseGuards(InternalSecretGuard)
  async internalClose() {
    return this.cyclesService.closeCycleIfDue();
  }
}
