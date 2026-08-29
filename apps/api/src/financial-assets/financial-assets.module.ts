import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { CyclesModule } from "../cycles/cycles.module.js";
import { EngagementModule } from "../engagement/engagement.module.js";
import { FinancialAssetsController } from "./financial-assets.controller.js";
import { FinancialAssetsService } from "./financial-assets.service.js";

@Module({
  imports: [AuthModule, EngagementModule, CyclesModule],
  controllers: [FinancialAssetsController],
  providers: [FinancialAssetsService],
})
export class FinancialAssetsModule {}
