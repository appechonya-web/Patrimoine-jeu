import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { CyclesModule } from "../cycles/cycles.module.js";
import { EngagementModule } from "../engagement/engagement.module.js";
import { SavingsController } from "./savings.controller.js";
import { SavingsService } from "./savings.service.js";

@Module({
  imports: [AuthModule, CyclesModule, EngagementModule],
  controllers: [SavingsController],
  providers: [SavingsService],
})
export class SavingsModule {}
