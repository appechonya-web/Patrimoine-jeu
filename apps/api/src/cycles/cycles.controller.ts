import { Controller, Get } from "@nestjs/common";
import { CyclesService } from "./cycles.service.js";

@Controller("cycles")
export class CyclesController {
  constructor(private readonly cyclesService: CyclesService) {}

  @Get("current")
  async current() {
    const cycle = await this.cyclesService.getOrCreateOpenCycle();
    return { number: cycle.number, status: cycle.status, startedAt: cycle.startedAt };
  }
}
