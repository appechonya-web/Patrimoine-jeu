import { BadRequestException, Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { NOTIFICATIONS_DEFAULT_LIMIT, setEmailAlertsInputSchema } from "@patrimoine-jeu/domain";
import { CurrentPlayer } from "../auth/current-player.decorator.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { NotificationsService } from "./notifications.service.js";

@Controller("notifications")
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  list(@CurrentPlayer() playerId: string, @Query("limit") limitParam?: string) {
    const limit = Math.min(100, Math.max(1, Number(limitParam ?? NOTIFICATIONS_DEFAULT_LIMIT)));
    return this.notificationsService.list(playerId, limit);
  }

  @Post("read")
  markAllRead(@CurrentPlayer() playerId: string) {
    return this.notificationsService.markAllRead(playerId);
  }

  @Get("email-alerts")
  getEmailAlertsPreference(@CurrentPlayer() playerId: string) {
    return this.notificationsService.getEmailAlertsPreference(playerId);
  }

  @Post("email-alerts")
  setEmailAlertsPreference(@CurrentPlayer() playerId: string, @Body() body: unknown) {
    const parsed = setEmailAlertsInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.notificationsService.setEmailAlertsPreference(playerId, parsed.data);
  }

  @Get("email-outbox")
  getEmailOutbox(@CurrentPlayer() playerId: string, @Query("limit") limitParam?: string) {
    const limit = Math.min(100, Math.max(1, Number(limitParam ?? NOTIFICATIONS_DEFAULT_LIMIT)));
    return this.notificationsService.getEmailOutbox(playerId, limit);
  }

  @Get("digest")
  getDigest(@CurrentPlayer() playerId: string) {
    return this.notificationsService.getDigest(playerId);
  }
}
