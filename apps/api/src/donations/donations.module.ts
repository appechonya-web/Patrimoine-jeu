import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { CyclesModule } from "../cycles/cycles.module.js";
import { EngagementModule } from "../engagement/engagement.module.js";
import { DonationsController } from "./donations.controller.js";
import { DonationsService } from "./donations.service.js";

@Module({
  imports: [AuthModule, CyclesModule, EngagementModule],
  controllers: [DonationsController],
  providers: [DonationsService],
})
export class DonationsModule {}
