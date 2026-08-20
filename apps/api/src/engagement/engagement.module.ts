import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { CyclesModule } from "../cycles/cycles.module.js";
import { AchievementsService } from "./achievements.service.js";
import { DailyBonusService } from "./daily-bonus.service.js";
import { EngagementController } from "./engagement.controller.js";

@Module({
  imports: [AuthModule, CyclesModule],
  controllers: [EngagementController],
  providers: [AchievementsService, DailyBonusService],
  exports: [AchievementsService],
})
export class EngagementModule {}
