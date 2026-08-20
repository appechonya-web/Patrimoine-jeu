import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { PRESS_FEED_DEFAULT_LIMIT } from "@patrimoine-jeu/domain";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { PressService } from "./press.service.js";

@Controller("press")
@UseGuards(JwtAuthGuard)
export class PressController {
  constructor(private readonly pressService: PressService) {}

  @Get()
  list(@Query("limit") limitParam?: string) {
    const limit = Math.min(100, Math.max(1, Number(limitParam ?? PRESS_FEED_DEFAULT_LIMIT)));
    return this.pressService.list(limit);
  }
}
