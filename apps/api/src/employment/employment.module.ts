import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { CyclesModule } from "../cycles/cycles.module.js";
import { EngagementModule } from "../engagement/engagement.module.js";
import { EmploymentController } from "./employment.controller.js";
import { EmploymentService } from "./employment.service.js";

@Module({
  imports: [AuthModule, CyclesModule, EngagementModule],
  controllers: [EmploymentController],
  providers: [EmploymentService],
  exports: [EmploymentService],
})
export class EmploymentModule {}
